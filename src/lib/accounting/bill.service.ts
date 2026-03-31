import type { PrismaClient, BillStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { JournalEntryService } from "./journal-entry.service";
import { generateDocumentNumber } from "./number-generator";

interface BillLineInput {
  itemId?: string;
  accountId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRateId?: string;
  taxAmount?: number;
}

interface CreateBillInput {
  vendorId: string;
  date: Date;
  dueDate: Date;
  vendorRef?: string;
  memo?: string;
  lines: BillLineInput[];
}

interface PayBillInput {
  date: Date;
  amount: number;
  method: string;
  bankAccountId: string;
  reference?: string;
  memo?: string;
}

export class BillService {
  private jeService: JournalEntryService;

  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {
    this.jeService = new JournalEntryService(prisma, organizationId);
  }

  async create(input: CreateBillInput) {
    const billNumber = await generateDocumentNumber(
      this.prisma, this.organizationId, "bill"
    );

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

    const subtotal = lines.reduce((s, l) => s.plus(l.amount), new Decimal(0));
    const taxAmount = lines.reduce((s, l) => s.plus(l.taxAmount), new Decimal(0));
    const totalAmount = subtotal.plus(taxAmount);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      return tx.bill.create({
        data: {
          organizationId: this.organizationId,
          billNumber,
          vendorId: input.vendorId,
          date: input.date,
          dueDate: input.dueDate,
          status: "UNPAID",
          subtotal: subtotal.toNumber(),
          taxAmount: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          amountPaid: 0,
          amountDue: totalAmount.toNumber(),
          vendorRef: input.vendorRef,
          memo: input.memo,
          lines: { create: lines },
        },
        include: {
          lines: { include: { item: true, account: true }, orderBy: { sortOrder: "asc" } },
          vendor: { select: { id: true, name: true } },
        },
      });
    });
  }

  async post(billId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const bill = await tx.bill.findUniqueOrThrow({
        where: { id: billId },
        include: { lines: true },
      });

      if (bill.organizationId !== this.organizationId) throw new Error("Bill not found.");

      // Find AP account
      const apAccount = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "2000", isSystemAccount: true },
      });
      if (!apAccount) throw new Error("Accounts Payable account not found.");

      // JE: DR Expense/COGS accounts, CR AP
      const jeLines: Array<{ accountId: string; description?: string; debit: number; credit: number; vendorId?: string }> = [];

      for (const line of bill.lines) {
        jeLines.push({
          accountId: line.accountId,
          description: line.description || `Bill ${bill.billNumber}`,
          debit: Number(line.amount),
          credit: 0,
        });
      }

      const totalTax = Number(bill.taxAmount);
      if (totalTax > 0) {
        const taxAccount = await tx.chartAccount.findFirst({
          where: { organizationId: this.organizationId, code: "2210" },
        });
        if (taxAccount) {
          jeLines.push({
            accountId: taxAccount.id,
            description: `Tax - Bill ${bill.billNumber}`,
            debit: totalTax,
            credit: 0,
          });
        }
      }

      jeLines.push({
        accountId: apAccount.id,
        description: `Bill ${bill.billNumber}`,
        debit: 0,
        credit: Number(bill.totalAmount),
        vendorId: bill.vendorId,
      });

      const je = await this.jeService.create({
        date: bill.date,
        memo: `Bill ${bill.billNumber}`,
        lines: jeLines,
        sourceType: "BILL",
        sourceId: bill.id,
      });

      const updated = await tx.bill.update({
        where: { id: billId },
        data: { journalEntryId: je.id },
        include: {
          lines: { include: { item: true, account: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      // Update vendor AP balance
      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: { balance: { increment: Number(bill.totalAmount) } },
      });

      return updated;
    });
  }

  async pay(billId: string, input: PayBillInput) {
    const paymentNumber = await generateDocumentNumber(
      this.prisma, this.organizationId, "billPayment"
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const bill = await tx.bill.findUniqueOrThrow({ where: { id: billId } });
      if (bill.organizationId !== this.organizationId) throw new Error("Bill not found.");

      const currentDue = new Decimal(bill.amountDue.toString());
      const payment = new Decimal(input.amount);
      if (payment.greaterThan(currentDue)) {
        throw new Error(`Payment ($${payment.toFixed(2)}) exceeds amount due ($${currentDue.toFixed(2)}).`);
      }

      // Find AP account
      const apAccount = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "2000", isSystemAccount: true },
      });
      if (!apAccount) throw new Error("Accounts Payable account not found.");

      // JE: DR AP, CR Bank
      const je = await this.jeService.create({
        date: input.date,
        memo: input.memo || `Bill Payment ${paymentNumber}`,
        lines: [
          { accountId: apAccount.id, debit: input.amount, credit: 0, vendorId: bill.vendorId },
          { accountId: input.bankAccountId, debit: 0, credit: input.amount },
        ],
        sourceType: "BILL_PAYMENT",
      });

      // Create bill payment record
      const billPayment = await tx.billPayment.create({
        data: {
          organizationId: this.organizationId,
          paymentNumber,
          vendorId: bill.vendorId,
          billId,
          date: input.date,
          amount: input.amount,
          method: input.method as never,
          bankAccountId: input.bankAccountId,
          reference: input.reference,
          memo: input.memo,
          journalEntryId: je.id,
        },
        include: {
          vendor: { select: { id: true, name: true } },
          bill: { select: { id: true, billNumber: true } },
        },
      });

      // Update bill
      const newPaid = new Decimal(bill.amountPaid.toString()).plus(payment);
      const newDue = currentDue.minus(payment);
      let newStatus: BillStatus;
      if (newDue.isZero()) newStatus = "PAID";
      else if (newPaid.greaterThan(0)) newStatus = "PARTIAL";
      else newStatus = bill.status;

      await tx.bill.update({
        where: { id: billId },
        data: { amountPaid: newPaid.toNumber(), amountDue: newDue.toNumber(), status: newStatus },
      });

      // Update vendor balance (reduce AP)
      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: { balance: { decrement: input.amount } },
      });

      return billPayment;
    });
  }

  async voidBill(billId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const bill = await tx.bill.findUniqueOrThrow({ where: { id: billId } });
      if (bill.organizationId !== this.organizationId) throw new Error("Bill not found.");
      if (bill.status === "VOIDED") throw new Error("Bill is already voided.");
      if (Number(bill.amountPaid) > 0) throw new Error("Cannot void a bill with payments. Remove payments first.");

      if (bill.journalEntryId) {
        await this.jeService.void(bill.journalEntryId);
      }

      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: { balance: { decrement: Number(bill.totalAmount) } },
      });

      return tx.bill.update({
        where: { id: billId },
        data: { status: "VOIDED" },
        include: { lines: { include: { item: true, account: true } }, vendor: { select: { id: true, name: true } } },
      });
    });
  }
}
