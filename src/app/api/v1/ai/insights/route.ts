import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ClaudeAIService } from "@/lib/ai/claude.service";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const insightsSchema = z.object({
  reportType: z.string(),
  reportData: z.record(z.string(), z.unknown()),
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
  const parsed = insightsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ai = new ClaudeAIService(prisma, organizationId);
    const insights = await ai.generateInsights(parsed.data.reportData, parsed.data.reportType);
    return NextResponse.json({ insights });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI insights failed" },
      { status: 500 }
    );
  }
}
