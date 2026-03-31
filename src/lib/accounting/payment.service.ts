import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { JournalEntryService } from "./journal-entry.service";
import { InvoiceService } from "./invoice.service";
import { generateDocumentNumber } from "./number-generator";

interface CreatePaymentInput {
  customerId: string;
  invoiceId?: string;
  date: Date;
  amount: number;
  method: string;
  reference?: string;
  depositToAccountId?: string;
  memo?: string;
}

export class PaymentService {
  private jeService: JournalEntryService;
  private invoiceService: InvoiceService;

  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {
    this.jeService = new JournalEntryService(prisma, organizationId);
    this.invoiceService = new InvoiceService(prisma, organizationId);
  }

  async create(input: CreatePaymentInput) {
    const paymentNumber = await generateDocumentNumber(
      this.prisma,
      this.organizationId,
      "payment"
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // Find system accounts
      const arAccount = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "1100", isSystemAccount: true },
      });
      if (!arAccount) throw new Error("Accounts Receivable account not found.");

      // Determine deposit account: specific bank account or Undeposited Funds
      let depositAccountId: string;
      if (input.depositToAccountId) {
        depositAccountId = input.depositToAccountId;
      } else {
        const undepositedFunds = await tx.chartAccount.findFirst({
          where: { organizationId: this.organizationId, code: "1200", isSystemAccount: true },
        });
        if (!undepositedFunds) throw new Error("Undeposited Funds account not found.");
        depositAccountId = undepositedFunds.id;
      }

      // Create journal entry: DR Bank/Undeposited Funds, CR Accounts Receivable
      const je = await this.jeService.create({
        date: input.date,
        memo: input.memo || `Payment ${paymentNumber}`,
        lines: [
          {
            accountId: depositAccountId,
            description: `Payment ${paymentNumber} from customer`,
            debit: input.amount,
            credit: 0,
            customerId: input.customerId,
          },
          {
            accountId: arAccount.id,
            description: `Payment ${paymentNumber} applied`,
            debit: 0,
            credit: input.amount,
            customerId: input.customerId,
          },
        ],
        sourceType: "PAYMENT",
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          organizationId: this.organizationId,
          paymentNumber,
          customerId: input.customerId,
          invoiceId: input.invoiceId,
          date: input.date,
          amount: input.amount,
          method: input.method as never,
          reference: input.reference,
          depositToAccountId: input.depositToAccountId,
          memo: input.memo,
          journalEntryId: je.id,
        },
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });

      // Apply to invoice if specified
      if (input.invoiceId) {
        await this.invoiceService.applyPayment(
          input.invoiceId,
          input.amount,
          payment.id
        );
      }

      // Update customer balance (reduce AR)
      await tx.customer.update({
        where: { id: input.customerId },
        data: { balance: { decrement: input.amount } },
      });

      return payment;
    });
  }
}
