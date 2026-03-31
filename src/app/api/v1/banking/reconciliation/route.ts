import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { BankingService } from "@/lib/accounting/banking.service";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const startReconciliationSchema = z.object({
  bankAccountId: z.string(),
  statementDate: z.string().transform((s) => new Date(s)),
  statementBalance: z.number(),
});

const finishReconciliationSchema = z.object({
  reconciliationId: z.string(),
  clearedBalance: z.number(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const bankAccountId = sp.get("bankAccountId");

  const where: Record<string, unknown> = {};
  if (bankAccountId) where.bankAccountId = bankAccountId;

  const reconciliations = await db.reconciliation.findMany({
    where,
    include: { bankAccount: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(reconciliations);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "bankReconciliation");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();

  // Determine if this is start or finish
  if (body.reconciliationId) {
    const parsed = finishReconciliationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    try {
      const service = new BankingService(prisma, organizationId);
      const recon = await service.finishReconciliation(parsed.data.reconciliationId, parsed.data.clearedBalance);
      return NextResponse.json(recon);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
    }
  }

  const parsed = startReconciliationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const service = new BankingService(prisma, organizationId);
    const recon = await service.startReconciliation(parsed.data);
    return NextResponse.json(recon, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
