import type { PrismaClient } from "@prisma/client";

type DocumentType =
  | "invoice"
  | "payment"
  | "bill"
  | "billPayment"
  | "expense"
  | "estimate"
  | "purchaseOrder"
  | "creditMemo"
  | "deposit"
  | "transfer"
  | "journalEntry";

const PREFIXES: Record<DocumentType, string> = {
  invoice: "INV",
  payment: "PMT",
  bill: "BILL",
  billPayment: "BP",
  expense: "EXP",
  estimate: "EST",
  purchaseOrder: "PO",
  creditMemo: "CM",
  deposit: "DEP",
  transfer: "TRF",
  journalEntry: "JE",
};

const MODEL_NUMBER_FIELDS: Record<DocumentType, { model: string; field: string }> = {
  invoice: { model: "invoice", field: "invoiceNumber" },
  payment: { model: "payment", field: "paymentNumber" },
  bill: { model: "bill", field: "billNumber" },
  billPayment: { model: "billPayment", field: "paymentNumber" },
  expense: { model: "expense", field: "expenseNumber" },
  estimate: { model: "estimate", field: "estimateNumber" },
  purchaseOrder: { model: "purchaseOrder", field: "poNumber" },
  creditMemo: { model: "creditMemo", field: "creditNumber" },
  deposit: { model: "deposit", field: "depositNumber" },
  transfer: { model: "transfer", field: "transferNumber" },
  journalEntry: { model: "journalEntry", field: "entryNumber" },
};

export async function generateDocumentNumber(
  prisma: PrismaClient,
  organizationId: string,
  docType: DocumentType
): Promise<string> {
  const prefix = PREFIXES[docType];
  const { model, field } = MODEL_NUMBER_FIELDS[docType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastRecord = await (prisma as any)[model].findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { [field]: true },
  });

  if (!lastRecord || !lastRecord[field]) {
    return `${prefix}-0001`;
  }

  const lastNumber = parseInt(lastRecord[field].split("-")[1], 10);
  return `${prefix}-${String(lastNumber + 1).padStart(4, "0")}`;
}
