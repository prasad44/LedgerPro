import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { BankingService } from "@/lib/accounting/banking.service";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createTransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  date: z.string().transform((s) => new Date(s)),
  memo: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const [transfers, total] = await Promise.all([
    db.transfer.findMany({
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.transfer.count(),
  ]);

  return NextResponse.json({
    data: transfers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;

  const body = await request.json();
  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.fromAccountId === parsed.data.toAccountId) {
    return NextResponse.json({ error: "Cannot transfer to the same account." }, { status: 400 });
  }

  try {
    const service = new BankingService(prisma, organizationId);
    const transfer = await service.createTransfer(parsed.data);
    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
