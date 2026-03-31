import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";
import { generateDocumentNumber } from "@/lib/accounting/number-generator";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createCreditMemoSchema = z.object({
  customerId: z.string(),
  date: z.string().transform((s) => new Date(s)),
  memo: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().optional(),
        description: z.string().max(200).optional(),
        quantity: z.number().min(0),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const customerId = sp.get("customerId");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;

  const [memos, total] = await Promise.all([
    db.creditMemo.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.creditMemo.count({ where }),
  ]);

  return NextResponse.json({
    data: memos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "estimatesAndCreditMemos");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCreditMemoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const creditNumber = await generateDocumentNumber(prisma, organizationId, "creditMemo");

    const lines = parsed.data.lines.map((l, i) => ({
      organizationId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.quantity * l.unitPrice,
      sortOrder: i,
    }));

    const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

    // Find revenue and AR accounts
    const arAccount = await prisma.chartAccount.findFirst({
      where: { organizationId, code: "1100", isSystemAccount: true },
    });
    const revenueAccount = await prisma.chartAccount.findFirst({
      where: { organizationId, code: "4000" },
    });
    if (!arAccount || !revenueAccount) throw new Error("Required accounts not found.");

    // Create JE: DR Revenue, CR AR
    const jeService = new JournalEntryService(prisma, organizationId);
    const je = await jeService.create({
      date: parsed.data.date,
      memo: `Credit Memo ${creditNumber}`,
      lines: [
        { accountId: revenueAccount.id, debit: totalAmount, credit: 0, customerId: parsed.data.customerId },
        { accountId: arAccount.id, debit: 0, credit: totalAmount, customerId: parsed.data.customerId },
      ],
      sourceType: "CREDIT_MEMO",
    });

    const creditMemo = await prisma.creditMemo.create({
      data: {
        organizationId,
        creditNumber,
        customerId: parsed.data.customerId,
        date: parsed.data.date,
        status: "DRAFT",
        subtotal: totalAmount,
        taxAmount: 0,
        totalAmount,
        amountUsed: 0,
        amountRemaining: totalAmount,
        memo: parsed.data.memo,
        journalEntryId: je.id,
        lines: {
          create: lines,
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        lines: true,
      },
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: parsed.data.customerId },
      data: { balance: { decrement: totalAmount } },
    });

    return NextResponse.json(creditMemo, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create credit memo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
