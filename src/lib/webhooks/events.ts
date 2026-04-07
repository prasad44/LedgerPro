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
