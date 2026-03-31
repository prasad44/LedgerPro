import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { JournalEntryService } from "./journal-entry.service";
import { generateDocumentNumber } from "./number-generator";

interface ExpenseLineInput {
  accountId: string;
  description?: string;
  amount: number;
  classId?: string;
  locationId?: string;
}

interface CreateExpenseInput {
  vendorId?: string;
  date: Date;
  paymentMethod: string;
  bankAccountId?: string;
  reference?: string;
  memo?: string;
  lines: ExpenseLineInput[];
}

export class ExpenseService {
  private jeService: JournalEntryService;

  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {
    this.jeService = new JournalEntryService(prisma, organizationId);
  }

  async create(input: CreateExpenseInput) {
    const expenseNumber = await generateDocumentNumber(
      this.prisma, this.organizationId, "expense"
    );

    const totalAmount = input.lines.reduce(
      (s, l) => s.plus(l.amount), new Decimal(0)
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      // Determine the credit account (bank or credit card paying for it)
      let creditAccountId: string;
      if (input.bankAccountId) {
        creditAccountId = input.bankAccountId;
      } else {
        // Default to checking account
        const checking = await tx.chartAccount.findFirst({
          where: { organizationId: this.organizationId, code: "1000" },
        });
        if (!checking) throw new Error("No bank account found. Select a payment account.");
        creditAccountId = checking.id;
      }

      // JE: DR Expense accounts, CR Bank/CC
      const jeLines: Array<{ accountId: string; description?: string; debit: number; credit: number; vendorId?: string }> = [];

      for (const line of input.lines) {
        jeLines.push({
          accountId: line.accountId,
          description: line.description || `Expense ${expenseNumber}`,
          debit: line.amount,
          credit: 0,
          vendorId: input.vendorId,
        });
      }

      jeLines.push({
        accountId: creditAccountId,
        description: `Expense ${expenseNumber}`,
        debit: 0,
        credit: totalAmount.toNumber(),
      });

      const je = await this.jeService.create({
        date: input.date,
        memo: input.memo || `Expense ${expenseNumber}`,
        lines: jeLines,
        sourceType: "EXPENSE",
      });

      const expense = await tx.expense.create({
        data: {
          organizationId: this.organizationId,
          expenseNumber,
          vendorId: input.vendorId,
          date: input.date,
          paymentMethod: input.paymentMethod as never,
          bankAccountId: input.bankAccountId,
          reference: input.reference,
          totalAmount: totalAmount.toNumber(),
          memo: input.memo,
          journalEntryId: je.id,
          lines: {
            create: input.lines.map((l, i) => ({
              organizationId: this.organizationId,
              accountId: l.accountId,
              description: l.description,
              amount: l.amount,
              classId: l.classId,
              locationId: l.locationId,
              sortOrder: i,
            })),
          },
        },
        include: {
          vendor: { select: { id: true, name: true } },
          lines: { include: { account: true }, orderBy: { sortOrder: "asc" } },
        },
      });

      return expense;
    });
  }
}
