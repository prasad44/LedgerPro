import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { z } from "zod";

const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  fiscalYear: z.number().int().min(2000).max(2100),
  type: z.enum(["PROFIT_AND_LOSS", "BALANCE_SHEET"]).default("PROFIT_AND_LOSS"),
  lines: z.array(z.object({
    accountId: z.string(),
    month: z.number().int().min(1).max(12),
    amount: z.number(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const fiscalYear = sp.get("fiscalYear");

  const where: Record<string, unknown> = {};
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);

  const budgets = await db.budget.findMany({
    where,
    include: {
      lines: {
        include: { budget: { select: { id: true } } },
        orderBy: [{ accountId: "asc" }, { month: "asc" }],
      },
      _count: { select: { lines: true } },
    },
    orderBy: [{ fiscalYear: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "budgetsAndForecasts");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createBudgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const budget = await db.budget.create({
      data: {
        organizationId,
        name: parsed.data.name,
        fiscalYear: parsed.data.fiscalYear,
        type: parsed.data.type,
        lines: parsed.data.lines
          ? {
              create: parsed.data.lines.map((l) => ({
                organizationId,
                accountId: l.accountId,
                month: l.month,
                amount: l.amount,
              })),
            }
          : undefined,
      },
      include: { _count: { select: { lines: true } } },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create budget";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
