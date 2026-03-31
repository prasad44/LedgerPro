import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTierFromPriceId } from "@/lib/paddle/config";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  // Verify webhook signature
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type;

  try {
    switch (eventType) {
      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(event.data);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;
      case "subscription.past_due":
        await handleSubscriptionPastDue(event.data);
        break;
      case "transaction.completed":
        await handleTransactionCompleted(event.data);
        break;
      default:
        // Acknowledge unknown events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Paddle webhook error [${eventType}]:`, error);
    // Return 500 so Paddle retries
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  // Parse: ts=1234567890;h1=abc123...
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const payload = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function handleSubscriptionCreated(data: any) {
  const customData = data.custom_data;
  const orgId = await resolveOrganizationId(data, customData);
  if (!orgId) return;

  const priceId = data.items?.[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : "STARTER";

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: "ACTIVE",
      paddleCustomerId: data.customer_id,
      paddleSubscriptionId: data.id,
      subscriptionStartDate: new Date(data.started_at || Date.now()),
      subscriptionEndDate: data.current_billing_period?.ends_at
        ? new Date(data.current_billing_period.ends_at)
        : null,
    },
  });
}

async function handleSubscriptionUpdated(data: any) {
  const org = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: data.id },
  });
  if (!org) return;

  const priceId = data.items?.[0]?.price?.id;
  const updates: Record<string, unknown> = {};

  if (priceId) {
    updates.subscriptionTier = getTierFromPriceId(priceId);
  }

  if (data.status === "active") {
    updates.subscriptionStatus = "ACTIVE";
  } else if (data.status === "trialing") {
    updates.subscriptionStatus = "TRIALING";
  }

  if (data.current_billing_period?.ends_at) {
    updates.subscriptionEndDate = new Date(data.current_billing_period.ends_at);
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: updates,
  });
}

async function handleSubscriptionCanceled(data: any) {
  const org = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: data.id },
  });
  if (!org) return;

  // Keep access until period end
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: "CANCELED",
      subscriptionEndDate: data.current_billing_period?.ends_at
        ? new Date(data.current_billing_period.ends_at)
        : null,
    },
  });
}

async function handleSubscriptionPastDue(data: any) {
  const org = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: data.id },
  });
  if (!org) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: "PAST_DUE" },
  });
}

async function handleTransactionCompleted(data: any) {
  const subscriptionId = data.subscription_id;
  if (!subscriptionId) return;

  const org = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: subscriptionId },
  });
  if (!org) return;

  // Update billing period dates
  if (data.billing_period?.ends_at) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionEndDate: new Date(data.billing_period.ends_at),
        subscriptionStatus: "ACTIVE",
      },
    });
  }
}

async function resolveOrganizationId(data: any, customData: any): Promise<string | null> {
  // Try custom_data.organizationId first
  if (customData?.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: customData.organizationId },
    });
    if (org) return org.id;
  }

  // Try by Paddle customer ID
  if (data.customer_id) {
    const org = await prisma.organization.findFirst({
      where: { paddleCustomerId: data.customer_id },
    });
    if (org) return org.id;
  }

  // Try by email via user membership
  const email = data.customer?.email;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const membership = await prisma.membership.findFirst({
        where: { userId: user.id, role: "OWNER" },
      });
      if (membership) return membership.organizationId;
    }
  }

  return null;
}
