import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ClaudeAIService } from "@/lib/ai/claude.service";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const askSchema = z.object({
  question: z.string().min(3).max(500),
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
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const ai = new ClaudeAIService(prisma, organizationId);
    const answer = await ai.answerQuestion(parsed.data.question);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI query failed" },
      { status: 500 }
    );
  }
}
