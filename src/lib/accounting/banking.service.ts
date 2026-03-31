import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { JournalEntryService } from "./journal-entry.service";
import { generateDocumentNumber } from "./number-generator";

interface CreateDepositInput {
  bankAccountId: string;
  date: Date;
  memo?: string;
  /** Amount to deposit from Undeposited Funds */
  totalAmount: number;
}

interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  memo?: string;
}

interface StartReconciliationInput {
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
}

export class BankingService {
  private jeService: JournalEntryService;

  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {
    this.jeService = new JournalEntryService(prisma, organizationId);
  }

  async createDeposit(input: CreateDepositInput) {
    const depositNumber = await generateDocumentNumber(
      this.prisma, this.organizationId, "deposit"
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // Get bank account's linked chart account
      const bankAccount = await tx.bankAccount.findUniqueOrThrow({
        where: { id: input.bankAccountId },
      });

      // Get Undeposited Funds account
      const undepositedFunds = await tx.chartAccount.findFirst({
        where: { organizationId: this.organizationId, code: "1200", isSystemAccount: true },
      });
      if (!undepositedFunds) throw new Error("Undeposited Funds account not found.");

      // JE: DR Bank Account, CR Undeposited Funds
      const je = await this.jeService.create({
        date: input.date,
        memo: input.memo || `Deposit ${depositNumber}`,
        lines: [
          { accountId: bankAccount.accountId, debit: input.totalAmount, credit: 0 },
          { accountId: undepositedFunds.id, debit: 0, credit: input.totalAmount },
        ],
        sourceType: "DEPOSIT",
      });

      const deposit = await tx.deposit.create({
        data: {
          organizationId: this.organizationId,
          depositNumber,
          bankAccountId: input.bankAccountId,
          date: input.date,
          totalAmount: input.totalAmount,
          memo: input.memo,
          journalEntryId: je.id,
        },
      });

      // Update bank account balance
      await tx.bankAccount.update({
        where: { id: input.bankAccountId },
        data: { currentBalance: { increment: input.totalAmount } },
      });

      return deposit;
    });
  }

  async createTransfer(input: CreateTransferInput) {
    const transferNumber = await generateDocumentNumber(
      this.prisma, this.organizationId, "transfer"
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // JE: DR To-Account, CR From-Account
      const je = await this.jeService.create({
        date: input.date,
        memo: input.memo || `Transfer ${transferNumber}`,
        lines: [
          { accountId: input.toAccountId, debit: input.amount, credit: 0 },
          { accountId: input.fromAccountId, debit: 0, credit: input.amount },
        ],
        sourceType: "TRANSFER",
      });

      const transfer = await tx.transfer.create({
        data: {
          organizationId: this.organizationId,
          transferNumber,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          amount: input.amount,
          date: input.date,
          memo: input.memo,
          journalEntryId: je.id,
        },
      });

      return transfer;
    });
  }

  async startReconciliation(input: StartReconciliationInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // Check no in-progress reconciliation exists
      const existing = await tx.reconciliation.findFirst({
        where: {
          organizationId: this.organizationId,
          bankAccountId: input.bankAccountId,
          status: "IN_PROGRESS",
        },
      });
      if (existing) throw new Error("A reconciliation is already in progress for this account.");

      return tx.reconciliation.create({
        data: {
          organizationId: this.organizationId,
          bankAccountId: input.bankAccountId,
          statementDate: input.statementDate,
          statementBalance: input.statementBalance,
          clearedBalance: 0,
          difference: input.statementBalance,
          status: "IN_PROGRESS",
        },
      });
    });
  }

  async finishReconciliation(reconciliationId: string, clearedBalance: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const recon = await tx.reconciliation.findUniqueOrThrow({
        where: { id: reconciliationId },
      });

      if (recon.organizationId !== this.organizationId) throw new Error("Not found.");
      if (recon.status !== "IN_PROGRESS") throw new Error("Reconciliation is not in progress.");

      const difference = new Decimal(recon.statementBalance.toString()).minus(clearedBalance);

      return tx.reconciliation.update({
        where: { id: reconciliationId },
        data: {
          clearedBalance,
          difference: difference.toNumber(),
          status: difference.isZero() ? "COMPLETED" : "IN_PROGRESS",
          completedAt: difference.isZero() ? new Date() : null,
        },
      });
    });
  }
}
