import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { BillService } from "@/lib/accounting/bill.service";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const payBillSchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "ACH", "WIRE", "OTHER"]),
  bankAccountId: z.string(),
  reference: z.string().max(100).optional(),
  memo: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;
  const { id } = await params;

  const body = await request.json();
  const parsed = payBillSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const service = new BillService(prisma, organizationId);
    const payment = await service.pay(id, parsed.data);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
