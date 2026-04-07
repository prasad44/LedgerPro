import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { getPaddleApiUrl, PADDLE_PRICES } from "@/lib/paddle/config";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";

// GET: current subscription details + management URLs
export async function GET() {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;

  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      trialEndsAt: true,
      transactionCount: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // If there's a Paddle subscription, fetch management URLs from Paddle API
  let managementUrls = null;
  if (org.paddleSubscriptionId && process.env.PADDLE_API_KEY) {
    try {
      const res = await fetch(
        `${getPaddleApiUrl()}/subscriptions/${org.paddleSubscriptionId}`,
        {
          headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        managementUrls = data.data?.management_urls || null;
      }
    } catch {
      // Non-critical — just return without management URLs
    }
  }

  return NextResponse.json({ ...org, managementUrls });
}

// POST: upgrade/downgrade or cancel
export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;

  const body = await request.json();
  const { action, targetTier } = body as { action: string; targetTier?: SubscriptionTier };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { paddleSubscriptionId: true },
  });

  if (!org?.paddleSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription found. Please subscribe first." },
      { status: 400 }
    );
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Paddle API not configured" }, { status: 500 });
  }

  const apiUrl = getPaddleApiUrl();

  if (action === "cancel") {
    const res = await fetch(
      `${apiUrl}/subscriptions/${org.paddleSubscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ effective_from: "next_billing_period" }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.detail || "Failed to cancel subscription" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Subscription will cancel at end of billing period." });
  }

  if (action === "change" && targetTier) {
    const newPriceId = PADDLE_PRICES[targetTier];
    if (!newPriceId) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const res = await fetch(
      `${apiUrl}/subscriptions/${org.paddleSubscriptionId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ price_id: newPriceId, quantity: 1 }],
          proration_billing_mode: "prorated_immediately",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.detail || "Failed to change plan" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: `Plan changed to ${targetTier}.` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
