import type { PrismaClient, InvoiceStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { JournalEntryService } from "./journal-entry.service";
import { generateDocumentNumber } from "./number-generator";

interface InvoiceLineInput {
  itemId?: string;
  accountId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string;
  taxAmount?: number;
}

interface CreateInvoiceInput {
  customerId: string;
  date: Date;
  dueDate: Date;
  terms?: string;
  memo?: string;
  footer?: string;
  lines: InvoiceLineInput[];
  discountAmount?: number;
}

export class InvoiceService {
  private jeService: JournalEntryService;

  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {
    this.jeService = new JournalEntryService(prisma, organizationId);
  }

  async create(input: CreateInvoiceInput) {
    const invoiceNumber = await generateDocumentNumber(
      this.prisma,
      this.organizationId,
      "invoice"
    );

    // Calculate line totals
    const lines = input.lines.map((line, i) => {
      const amount = new Decimal(line.quantity).times(line.unitPrice);
      const taxAmount = new Decimal(line.taxAmount ?? 0);
      return {
        organizationId: this.organizationId,
        itemId: line.itemId,
        accountId: line.accountId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: amount.toNumber(),
        taxRateId: line.taxRateId,
        taxAmount: taxAmount.toNumber(),
        sortOrder: i,
      };
    });

    const subtotal = lines.reduce(
      (sum, l) => sum.plus(l.amount),
      new Decimal(0)
    );
    const taxAmount = lines.reduce(
      (sum, l) => sum.plus(l.taxAmount),
      new Decimal(0)
    );
    const discountAmount = new Decimal(input.discountAmount ?? 0);
    const totalAmount = subtotal.plus(taxAmount).minus(discountAmount);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const invoice = await tx.invoice.create({
        data: {
          organizationId: this.organizationId,
          invoiceNumber,
          customerId: input.customerId,
          date: input.date,
          dueDate: input.dueDate,
          status: "DRAFT",
          subtotal: subtotal.toNumber(),
          taxAmount: taxAmount.toNumber(),
          discountAmount: discountAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          amountPaid: 0,
          amountDue: totalAmount.toNumber(),
          terms: input.terms,
          memo: input.memo,
          footer: input.footer,
          lines: { create: lines },
        },
        include: {
          lines: { include: { item: true, account: true }, orderBy: { sortOrder: "asc" } },
          customer: { select: { id: true, name: true, email: true } },
        },
      });

      return invoice;
    });
  }

  async post(invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { lines: true },
      });

      if (invoice.organizationId !== this.organizationId) {
        throw new Error("Invoice not found.");
      }
      if (invoice.status !== "DRAFT") {
        throw new Error("Only draft invoices can be posted.");
      }

      // Find system accounts
      const arAccount = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "1100", isSystemAccount: true },
      });
      const taxAccount = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "2210" },
      });

      if (!arAccount) throw new Error("Accounts Receivable account not found.");

      // Build journal entry lines
      const jeLines: Array<{
        accountId: string;
        description?: string;
        debit: number;
        credit: number;
        customerId?: string;
      }> = [];

      // DR Accounts Receivable for total
      jeLines.push({
        accountId: arAccount.id,
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: Number(invoice.totalAmount),
        credit: 0,
        customerId: invoice.customerId,
      });

      // CR Revenue accounts for each line
      for (const line of invoice.lines) {
        jeLines.push({
          accountId: line.accountId,
          description: line.description || `Invoice ${invoice.invoiceNumber}`,
          debit: 0,
          credit: Number(line.amount),
        });
      }

      // CR Sales Tax Payable if applicable
      const totalTax = Number(invoice.taxAmount);
      if (totalTax > 0 && taxAccount) {
        jeLines.push({
          accountId: taxAccount.id,
          description: `Sales tax - Invoice ${invoice.invoiceNumber}`,
          debit: 0,
          credit: totalTax,
        });
      }

      // Handle discount as a debit to Discounts Given (4020) if present
      const discountAmt = Number(invoice.discountAmount);
      if (discountAmt > 0) {
        const discountAccount = await tx.chartAccount.findFirst({
          where: { organizationId: this.organizationId, code: "4020" },
        });
        if (discountAccount) {
          jeLines.push({
            accountId: discountAccount.id,
            description: `Discount - Invoice ${invoice.invoiceNumber}`,
            debit: discountAmt,
            credit: 0,
          });
        }
      }

      // Create journal entry
      const je = await this.jeService.create({
        date: invoice.date,
        memo: `Invoice ${invoice.invoiceNumber}`,
        lines: jeLines,
        sourceType: "INVOICE",
        sourceId: invoice.id,
      });

      // Update invoice status and link JE
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "SENT",
          journalEntryId: je.id,
          sentAt: new Date(),
        },
        include: {
          lines: { include: { item: true, account: true }, orderBy: { sortOrder: "asc" } },
          customer: { select: { id: true, name: true, email: true } },
        },
      });

      // Update customer AR balance
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { increment: Number(invoice.totalAmount) } },
      });

      return updated;
    });
  }

  async applyPayment(
    invoiceId: string,
    paymentAmount: number,
    paymentId?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });

      if (invoice.organizationId !== this.organizationId) {
        throw new Error("Invoice not found.");
      }

      const currentDue = new Decimal(invoice.amountDue.toString());
      const payment = new Decimal(paymentAmount);

      if (payment.greaterThan(currentDue)) {
        throw new Error(
          `Payment amount ($${payment.toFixed(2)}) exceeds amount due ($${currentDue.toFixed(2)}).`
        );
      }

      const newAmountPaid = new Decimal(invoice.amountPaid.toString()).plus(payment);
      const newAmountDue = currentDue.minus(payment);

      let newStatus: InvoiceStatus;
      if (newAmountDue.isZero()) {
        newStatus = "PAID";
      } else if (newAmountPaid.greaterThan(0)) {
        newStatus = "PARTIAL";
      } else {
        newStatus = invoice.status;
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid.toNumber(),
          amountDue: newAmountDue.toNumber(),
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : undefined,
        },
      });
    });
  }

  async voidInvoice(invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });

      if (invoice.organizationId !== this.organizationId) {
        throw new Error("Invoice not found.");
      }
      if (invoice.status === "VOIDED") {
        throw new Error("Invoice is already voided.");
      }
      if (Number(invoice.amountPaid) > 0) {
        throw new Error("Cannot void an invoice with payments applied. Remove payments first.");
      }

      // Void the linked journal entry if exists
      if (invoice.journalEntryId) {
        await this.jeService.void(invoice.journalEntryId);
      }

      // Reverse customer balance
      const totalAmount = Number(invoice.totalAmount);
      if (invoice.status !== "DRAFT") {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { decrement: totalAmount } },
        });
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "VOIDED" },
        include: {
          lines: { include: { item: true, account: true } },
          customer: { select: { id: true, name: true } },
        },
      });
    });
  }
}
