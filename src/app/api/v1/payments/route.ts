import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { PaymentService } from "@/lib/accounting/payment.service";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createPaymentSchema = z.object({
  customerId: z.string(),
  invoiceId: z.string().optional(),
  date: z.string().transform((s) => new Date(s)),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "ACH", "WIRE", "OTHER"]),
  reference: z.string().max(100).optional(),
  depositToAccountId: z.string().optional(),
  memo: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const customerId = sp.get("customerId");
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.date = dateFilter;
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.payment.count({ where }),
  ]);

  return NextResponse.json({
    data: payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;

  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new PaymentService(prisma, organizationId);
    const payment = await service.create(parsed.data);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
