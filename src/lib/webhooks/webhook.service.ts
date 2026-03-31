import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export type WebhookEventType =
  | "invoice.created" | "invoice.sent" | "invoice.paid" | "invoice.voided"
  | "payment.received"
  | "bill.created" | "bill.paid" | "bill.voided"
  | "expense.created"
  | "customer.created" | "customer.updated"
  | "vendor.created" | "vendor.updated"
  | "journal_entry.posted" | "journal_entry.voided";

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "invoice.created", "invoice.sent", "invoice.paid", "invoice.voided",
  "payment.received",
  "bill.created", "bill.paid", "bill.voided",
  "expense.created",
  "customer.created", "customer.updated",
  "vendor.created", "vendor.updated",
  "journal_entry.posted", "journal_entry.voided",
];

interface EmitEventOptions {
  organizationId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  userId?: string;
}

export async function emitWebhookEvent(options: EmitEventOptions) {
  const { organizationId, eventType, payload, userId } = options;

  // Log to audit log
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId || "system",
      action: eventType,
      entityType: eventType.split(".")[0],
      entityId: (payload.id as string) || "",
      changes: payload as any,
    },
  });

  // Find registered webhook endpoints that listen for this event
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId,
      isActive: true,
      events: { has: eventType },
    },
  });

  // Deliver to each endpoint (fire and forget — in production, use a queue)
  const deliveryPromises = endpoints.map((endpoint) =>
    deliverWebhook(endpoint, eventType, payload).catch((err) => {
      console.error(`Webhook delivery failed for ${endpoint.url}:`, err);
    })
  );

  // Don't block the caller
  Promise.allSettled(deliveryPromises);
}

async function deliverWebhook(
  endpoint: { url: string; secret: string },
  eventType: string,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `${timestamp}:${body}`;
  const signature = crypto
    .createHmac("sha256", endpoint.secret)
    .update(signaturePayload)
    .digest("hex");

  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": `ts=${timestamp};h1=${signature}`,
      "X-Webhook-Event": eventType,
    },
    body,
    signal: AbortSignal.timeout(10000), // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }
}
