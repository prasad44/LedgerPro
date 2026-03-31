import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/webhook.service";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import crypto from "crypto";
import { z } from "zod";

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const endpoints = await db.webhookEndpoint.findMany({
    where: { isActive: true },
    select: {
      id: true, url: true, events: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Also return available events for the UI
  return NextResponse.json({ endpoints, availableEvents: ALL_WEBHOOK_EVENTS });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "webhooks");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Generate a signing secret for this endpoint
  const secret = `whsec_${crypto.randomBytes(24).toString("base64url")}`;

  const endpoint = await db.webhookEndpoint.create({
    data: {
      organizationId,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
    },
    select: { id: true, url: true, events: true, createdAt: true },
  });

  // Return secret ONCE
  return NextResponse.json({ ...endpoint, secret }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.webhookEndpoint.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
