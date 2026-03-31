import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ClaudeAIService } from "@/lib/ai/claude.service";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const categorizeSchema = z.object({
  transactions: z.array(
    z.object({
      description: z.string(),
      amount: z.number(),
      date: z.string().optional(),
      vendor: z.string().optional(),
    })
  ).min(1).max(25),
});

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "aiFeatures");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = categorizeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ai = new ClaudeAIService(prisma, organizationId);

    if (parsed.data.transactions.length === 1) {
      const result = await ai.categorizeTransaction(parsed.data.transactions[0]);
      return NextResponse.json(result);
    }

    const results = await ai.batchCategorize(parsed.data.transactions);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI categorization failed" },
      { status: 500 }
    );
  }
}
