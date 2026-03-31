import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { BillService } from "@/lib/accounting/bill.service";
import { checkFeature, checkTransactionLimit } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createBillSchema = z.object({
  vendorId: z.string(),
  date: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)),
  vendorRef: z.string().max(100).optional(),
  memo: z.string().max(500).optional(),
  lines: z.array(z.object({
    itemId: z.string().optional(),
    accountId: z.string(),
    description: z.string().max(200).optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    taxRateId: z.string().optional(),
    taxAmount: z.number().min(0).optional(),
  })).min(1),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const vendorId = sp.get("vendorId");
  const search = sp.get("search");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (search) {
    where.OR = [
      { billNumber: { contains: search, mode: "insensitive" } },
      { vendorRef: { contains: search, mode: "insensitive" } },
      { vendor: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [bills, total] = await Promise.all([
    db.bill.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        lines: { include: { item: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.bill.count({ where }),
  ]);

  return NextResponse.json({
    data: bills,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "billsAndBillPayments");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const org = await db.organization.findFirst({
    where: { id: organizationId }, select: { transactionCount: true },
  });
  if (org) {
    const limitCheck = checkTransactionLimit(tier as SubscriptionTier, org.transactionCount);
    if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const service = new BillService(prisma, organizationId);
    const bill = await service.create(parsed.data);
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
