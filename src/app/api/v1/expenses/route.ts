import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ExpenseService } from "@/lib/accounting/expense.service";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createExpenseSchema = z.object({
  vendorId: z.string().optional(),
  date: z.string().transform((s) => new Date(s)),
  paymentMethod: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "ACH", "WIRE", "OTHER"]),
  bankAccountId: z.string().optional(),
  reference: z.string().max(100).optional(),
  memo: z.string().max(500).optional(),
  lines: z.array(z.object({
    accountId: z.string(),
    description: z.string().max(200).optional(),
    amount: z.number().positive(),
    classId: z.string().optional(),
    locationId: z.string().optional(),
  })).min(1),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const vendorId = sp.get("vendorId");
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;
  if (startDate || endDate) {
    const d: Record<string, Date> = {};
    if (startDate) d.gte = new Date(startDate);
    if (endDate) d.lte = new Date(endDate);
    where.date = d;
  }

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        lines: { include: { account: { select: { id: true, name: true, code: true } } }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.expense.count({ where }),
  ]);

  return NextResponse.json({
    data: expenses,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;

  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const service = new ExpenseService(prisma, organizationId);
    const expense = await service.create(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
