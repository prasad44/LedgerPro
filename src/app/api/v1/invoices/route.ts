import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { InvoiceService } from "@/lib/accounting/invoice.service";
import { checkFeature, checkTransactionLimit } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createInvoiceSchema = z.object({
  customerId: z.string(),
  date: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)),
  terms: z.string().optional(),
  memo: z.string().max(500).optional(),
  footer: z.string().max(500).optional(),
  discountAmount: z.number().min(0).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().optional(),
        accountId: z.string(),
        description: z.string().max(200).optional(),
        quantity: z.number().min(0),
        unitPrice: z.number().min(0),
        taxRateId: z.string().optional(),
        taxAmount: z.number().min(0).optional(),
      })
    )
    .min(1, "At least one line required"),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const customerId = sp.get("customerId");
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const search = sp.get("search");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { memo: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.date = dateFilter;
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: invoices,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "basicInvoicing");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: { transactionCount: true },
  });
  if (org) {
    const limitCheck = checkTransactionLimit(tier as SubscriptionTier, org.transactionCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new InvoiceService(prisma, organizationId);
    const invoice = await service.create(parsed.data);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
