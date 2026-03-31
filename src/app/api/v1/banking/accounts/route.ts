import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { z } from "zod";

const createBankAccountSchema = z.object({
  accountId: z.string(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(4).optional(),
  routingNumber: z.string().max(4).optional(),
  currency: z.string().max(3).default("USD"),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const bankAccounts = await db.bankAccount.findMany({
    where: { isActive: true },
    include: {
      reconciliations: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { statementDate: true, completedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Also fetch linked Chart of Account info
  const accountIds = bankAccounts.map((ba) => ba.accountId);
  const chartAccounts = await db.chartAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true, code: true, balance: true },
  });

  const accountMap = Object.fromEntries(chartAccounts.map((a) => [a.id, a]));

  const enriched = bankAccounts.map((ba) => ({
    ...ba,
    chartAccount: accountMap[ba.accountId] || null,
    lastReconciled: ba.reconciliations[0]?.statementDate || null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "bankReconciliation");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createBankAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify the account exists and is a BANK type
  const chartAccount = await db.chartAccount.findFirst({
    where: { id: parsed.data.accountId, type: "BANK" },
  });
  if (!chartAccount) {
    return NextResponse.json({ error: "Selected account is not a bank account." }, { status: 400 });
  }

  const bankAccount = await db.bankAccount.create({
    data: {
      organizationId,
      ...parsed.data,
    },
  });

  return NextResponse.json(bankAccount, { status: 201 });
}
