import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import {
  type CreateJournalEntryInput,
  ACCOUNT_NORMAL_BALANCES,
} from "./types";

export class JournalEntryService {
  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {}

  async create(input: CreateJournalEntryInput) {
    this.validateLines(input.lines);

    const entryNumber = await this.generateEntryNumber();

    const journalEntry = await this.prisma.$transaction(async (tx) => {
      // Set tenant context for RLS
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // Create the journal entry with lines
      const entry = await tx.journalEntry.create({
        data: {
          organizationId: this.organizationId,
          entryNumber,
          date: input.date,
          memo: input.memo,
          reference: input.reference,
          isAdjusting: input.isAdjusting ?? false,
          sourceType: input.sourceType ?? "MANUAL",
          sourceId: input.sourceId,
          status: "POSTED",
          postedAt: new Date(),
          lines: {
            create: input.lines.map((line) => ({
              organizationId: this.organizationId,
              accountId: line.accountId,
              description: line.description,
              debit: line.debit,
              credit: line.credit,
              classId: line.classId,
              locationId: line.locationId,
              customerId: line.customerId,
              vendorId: line.vendorId,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: { select: { id: true, name: true, code: true, type: true } },
            },
          },
        },
      });

      // Update account balances based on normal balance rules
      for (const line of input.lines) {
        const account = await tx.chartAccount.findUniqueOrThrow({
          where: { id: line.accountId },
          select: { type: true },
        });

        const normalBalance = ACCOUNT_NORMAL_BALANCES[account.type];
        const balanceChange =
          normalBalance === "DEBIT"
            ? new Decimal(line.debit).minus(line.credit)
            : new Decimal(line.credit).minus(line.debit);

        await tx.chartAccount.update({
          where: { id: line.accountId },
          data: { balance: { increment: balanceChange.toNumber() } },
        });
      }

      // Increment organization transaction count
      await tx.organization.update({
        where: { id: this.organizationId },
        data: { transactionCount: { increment: 1 } },
      });

      return entry;
    });

    return journalEntry;
  }

  async void(journalEntryId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const entry = await tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntryId },
        include: {
          lines: {
            include: { account: { select: { id: true, type: true } } },
          },
        },
      });

      if (entry.organizationId !== this.organizationId) {
        throw new Error("Journal entry not found.");
      }

      if (entry.status === "VOIDED") {
        throw new Error("Journal entry is already voided.");
      }

      // Reverse all account balance impacts
      for (const line of entry.lines) {
        const normalBalance = ACCOUNT_NORMAL_BALANCES[line.account.type];
        const reversal =
          normalBalance === "DEBIT"
            ? new Decimal(line.credit.toString()).minus(line.debit.toString())
            : new Decimal(line.debit.toString()).minus(line.credit.toString());

        await tx.chartAccount.update({
          where: { id: line.accountId },
          data: { balance: { increment: reversal.toNumber() } },
        });
      }

      return tx.journalEntry.update({
        where: { id: journalEntryId },
        data: { status: "VOIDED" },
        include: {
          lines: {
            include: {
              account: { select: { id: true, name: true, code: true, type: true } },
            },
          },
        },
      });
    });
  }

  async getById(id: string) {
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    return this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: { select: { id: true, name: true, code: true, type: true } },
          },
          orderBy: { debit: "desc" },
        },
      },
    });
  }

  private validateLines(lines: CreateJournalEntryInput["lines"]) {
    if (lines.length < 2) {
      throw new Error("A journal entry must have at least two lines.");
    }

    const totalDebits = lines.reduce(
      (sum, l) => sum.plus(l.debit),
      new Decimal(0)
    );
    const totalCredits = lines.reduce(
      (sum, l) => sum.plus(l.credit),
      new Decimal(0)
    );

    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Journal entry is not balanced. Debits: ${totalDebits.toFixed(4)}, Credits: ${totalCredits.toFixed(4)}`
      );
    }

    if (totalDebits.isZero()) {
      throw new Error("Journal entry must have at least one non-zero amount.");
    }

    for (const line of lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new Error(
          "A journal line cannot have both a debit and credit amount."
        );
      }
      if (line.debit < 0 || line.credit < 0) {
        throw new Error("Journal line amounts cannot be negative.");
      }
    }
  }

  private async generateEntryNumber(): Promise<string> {
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { organizationId: this.organizationId },
      orderBy: { createdAt: "desc" },
      select: { entryNumber: true },
    });

    if (!lastEntry) return "JE-0001";

    const lastNum = parseInt(lastEntry.entryNumber.split("-")[1], 10);
    return `JE-${String(lastNum + 1).padStart(4, "0")}`;
  }
}
