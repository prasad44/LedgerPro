import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";
import { checkTransactionLimit } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createJournalEntrySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  memo: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  isAdjusting: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string(),
        description: z.string().max(200).optional(),
        debit: z.number().min(0),
        credit: z.number().min(0),
        classId: z.string().optional(),
        locationId: z.string().optional(),
        customerId: z.string().optional(),
        vendorId: z.string().optional(),
      })
    )
    .min(2, "At least two lines required"),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { entryNumber: { contains: search, mode: "insensitive" } },
      { memo: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.date = dateFilter;
  }

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { id: true, name: true, code: true, type: true } },
          },
          orderBy: { debit: "desc" },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.journalEntry.count({ where }),
  ]);

  return NextResponse.json({
    data: entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  // Check transaction limit
  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: { transactionCount: true },
  });

  if (org) {
    const limitCheck = checkTransactionLimit(
      tier as SubscriptionTier,
      org.transactionCount
    );
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = createJournalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const service = new JournalEntryService(prisma, organizationId);
    const entry = await service.create(parsed.data);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create journal entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
