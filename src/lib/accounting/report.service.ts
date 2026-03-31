import type { PrismaClient, AccountType } from "@prisma/client";
import Decimal from "decimal.js";
import {
  ACCOUNT_NORMAL_BALANCES,
  ASSET_TYPES,
  LIABILITY_TYPES,
  ACCOUNT_TYPE_LABELS,
} from "./types";

export interface ReportAccountLine {
  accountId: string;
  code: string | null;
  name: string;
  type: AccountType;
  debitTotal: number;
  creditTotal: number;
  netBalance: number;
}

export interface ReportSection {
  title: string;
  accounts: ReportAccountLine[];
  total: number;
}

export interface ProfitLossReport {
  startDate: Date;
  endDate: Date;
  revenue: ReportSection;
  costOfGoodsSold: ReportSection;
  grossProfit: number;
  expenses: ReportSection;
  otherIncome: ReportSection;
  otherExpense: ReportSection;
  netOtherIncome: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  asOfDate: Date;
  currentAssets: ReportSection;
  longTermAssets: ReportSection;
  totalAssets: number;
  currentLiabilities: ReportSection;
  longTermLiabilities: ReportSection;
  totalLiabilities: number;
  equity: ReportSection;
  netIncome: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export interface TrialBalanceReport {
  asOfDate: Date;
  accounts: ReportAccountLine[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface AgingBucket {
  label: string;
  amount: number;
}

export interface AgingReport {
  asOfDate: Date;
  entities: Array<{
    id: string;
    name: string;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  }>;
  totals: AgingBucket[];
  grandTotal: number;
}

export class ReportService {
  constructor(
    private prisma: PrismaClient,
    private organizationId: string
  ) {}

  async profitAndLoss(startDate: Date, endDate: Date): Promise<ProfitLossReport> {
    const lines = await this.getJournalLinesByDateRange(startDate, endDate);

    const revenue = this.buildSection("Revenue", lines, ["INCOME"]);
    const cogs = this.buildSection("Cost of Goods Sold", lines, ["COST_OF_GOODS_SOLD"]);
    const grossProfit = new Decimal(revenue.total).minus(cogs.total).toNumber();

    const expenses = this.buildSection("Expenses", lines, ["EXPENSE"]);
    const otherIncome = this.buildSection("Other Income", lines, ["OTHER_INCOME"]);
    const otherExpense = this.buildSection("Other Expense", lines, ["OTHER_EXPENSE"]);
    const netOtherIncome = new Decimal(otherIncome.total).minus(otherExpense.total).toNumber();

    const netIncome = new Decimal(grossProfit).minus(expenses.total).plus(netOtherIncome).toNumber();

    return {
      startDate, endDate,
      revenue, costOfGoodsSold: cogs, grossProfit,
      expenses, otherIncome, otherExpense, netOtherIncome,
      netIncome,
    };
  }

  async balanceSheet(asOfDate: Date): Promise<BalanceSheetReport> {
    // Get all account balances as of date
    const accounts = await this.getAccountBalancesAsOf(asOfDate);

    const currentAssets = this.buildBalanceSection("Current Assets", accounts, ["BANK", "ACCOUNTS_RECEIVABLE", "OTHER_CURRENT_ASSET"]);
    const longTermAssets = this.buildBalanceSection("Long-Term Assets", accounts, ["FIXED_ASSET", "OTHER_ASSET"]);
    const totalAssets = new Decimal(currentAssets.total).plus(longTermAssets.total).toNumber();

    const currentLiabilities = this.buildBalanceSection("Current Liabilities", accounts, ["ACCOUNTS_PAYABLE", "CREDIT_CARD", "OTHER_CURRENT_LIABILITY"]);
    const longTermLiabilities = this.buildBalanceSection("Long-Term Liabilities", accounts, ["LONG_TERM_LIABILITY"]);
    const totalLiabilities = new Decimal(currentLiabilities.total).plus(longTermLiabilities.total).toNumber();

    const equity = this.buildBalanceSection("Equity", accounts, ["EQUITY"]);

    // Calculate net income for the current fiscal year
    const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1); // Jan 1
    const pl = await this.profitAndLoss(fiscalYearStart, asOfDate);
    const netIncome = pl.netIncome;

    const totalEquity = new Decimal(equity.total).plus(netIncome).toNumber();
    const totalLiabilitiesAndEquity = new Decimal(totalLiabilities).plus(totalEquity).toNumber();

    return {
      asOfDate,
      currentAssets, longTermAssets, totalAssets,
      currentLiabilities, longTermLiabilities, totalLiabilities,
      equity, netIncome, totalEquity,
      totalLiabilitiesAndEquity,
    };
  }

  async trialBalance(asOfDate: Date): Promise<TrialBalanceReport> {
    const accounts = await this.getAccountBalancesAsOf(asOfDate);

    const reportLines: ReportAccountLine[] = accounts
      .filter((a) => a.netBalance !== 0)
      .map((a) => ({
        ...a,
        debitTotal: ACCOUNT_NORMAL_BALANCES[a.type] === "DEBIT" ? Math.abs(a.netBalance) : 0,
        creditTotal: ACCOUNT_NORMAL_BALANCES[a.type] === "CREDIT" ? Math.abs(a.netBalance) : 0,
      }));

    const totalDebits = reportLines.reduce((s, l) => s.plus(l.debitTotal), new Decimal(0)).toNumber();
    const totalCredits = reportLines.reduce((s, l) => s.plus(l.creditTotal), new Decimal(0)).toNumber();

    return {
      asOfDate,
      accounts: reportLines,
      totalDebits,
      totalCredits,
      isBalanced: new Decimal(totalDebits).equals(totalCredits),
    };
  }

  async arAging(asOfDate: Date): Promise<AgingReport> {
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: this.organizationId,
        status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
        date: { lte: asOfDate },
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    const entityMap = new Map<string, { id: string; name: string; current: number; days1to30: number; days31to60: number; days61to90: number; over90: number; total: number }>();

    for (const inv of invoices) {
      const daysOverdue = Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amountDue = Number(inv.amountDue);

      if (!entityMap.has(inv.customerId)) {
        entityMap.set(inv.customerId, { id: inv.customerId, name: inv.customer.name, current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 });
      }
      const entry = entityMap.get(inv.customerId)!;
      entry.total += amountDue;

      if (daysOverdue <= 0) entry.current += amountDue;
      else if (daysOverdue <= 30) entry.days1to30 += amountDue;
      else if (daysOverdue <= 60) entry.days31to60 += amountDue;
      else if (daysOverdue <= 90) entry.days61to90 += amountDue;
      else entry.over90 += amountDue;
    }

    const entities = Array.from(entityMap.values()).sort((a, b) => b.total - a.total);
    const totals: AgingBucket[] = [
      { label: "Current", amount: entities.reduce((s, e) => s + e.current, 0) },
      { label: "1-30 Days", amount: entities.reduce((s, e) => s + e.days1to30, 0) },
      { label: "31-60 Days", amount: entities.reduce((s, e) => s + e.days31to60, 0) },
      { label: "61-90 Days", amount: entities.reduce((s, e) => s + e.days61to90, 0) },
      { label: "90+ Days", amount: entities.reduce((s, e) => s + e.over90, 0) },
    ];

    return { asOfDate, entities, totals, grandTotal: entities.reduce((s, e) => s + e.total, 0) };
  }

  async apAging(asOfDate: Date): Promise<AgingReport> {
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId: this.organizationId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        date: { lte: asOfDate },
      },
      include: { vendor: { select: { id: true, name: true } } },
    });

    const entityMap = new Map<string, { id: string; name: string; current: number; days1to30: number; days31to60: number; days61to90: number; over90: number; total: number }>();

    for (const bill of bills) {
      const daysOverdue = Math.floor((asOfDate.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amountDue = Number(bill.amountDue);

      if (!entityMap.has(bill.vendorId)) {
        entityMap.set(bill.vendorId, { id: bill.vendorId, name: bill.vendor.name, current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 });
      }
      const entry = entityMap.get(bill.vendorId)!;
      entry.total += amountDue;

      if (daysOverdue <= 0) entry.current += amountDue;
      else if (daysOverdue <= 30) entry.days1to30 += amountDue;
      else if (daysOverdue <= 60) entry.days31to60 += amountDue;
      else if (daysOverdue <= 90) entry.days61to90 += amountDue;
      else entry.over90 += amountDue;
    }

    const entities = Array.from(entityMap.values()).sort((a, b) => b.total - a.total);
    const totals: AgingBucket[] = [
      { label: "Current", amount: entities.reduce((s, e) => s + e.current, 0) },
      { label: "1-30 Days", amount: entities.reduce((s, e) => s + e.days1to30, 0) },
      { label: "31-60 Days", amount: entities.reduce((s, e) => s + e.days31to60, 0) },
      { label: "61-90 Days", amount: entities.reduce((s, e) => s + e.days61to90, 0) },
      { label: "90+ Days", amount: entities.reduce((s, e) => s + e.over90, 0) },
    ];

    return { asOfDate, entities, totals, grandTotal: entities.reduce((s, e) => s + e.total, 0) };
  }

  // ─── Private helpers ────────────────────────────────────────

  private async getJournalLinesByDateRange(startDate: Date, endDate: Date) {
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId: this.organizationId,
        journalEntry: {
          date: { gte: startDate, lte: endDate },
          status: "POSTED",
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    // Aggregate by account
    const accountMap = new Map<string, ReportAccountLine>();
    for (const line of lines) {
      const key = line.accountId;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountId: line.account.id,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          debitTotal: 0,
          creditTotal: 0,
          netBalance: 0,
        });
      }
      const entry = accountMap.get(key)!;
      entry.debitTotal += Number(line.debit);
      entry.creditTotal += Number(line.credit);
    }

    // Calculate net balance based on normal balance
    for (const entry of accountMap.values()) {
      const normal = ACCOUNT_NORMAL_BALANCES[entry.type];
      entry.netBalance = normal === "DEBIT"
        ? entry.debitTotal - entry.creditTotal
        : entry.creditTotal - entry.debitTotal;
    }

    return Array.from(accountMap.values());
  }

  private async getAccountBalancesAsOf(asOfDate: Date): Promise<ReportAccountLine[]> {
    // Use the running balances from chart accounts (as-of snapshots would need a more complex query)
    // For now, use current balances — accurate if no future-dated entries exist
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

    const accounts = await this.prisma.chartAccount.findMany({
      where: { organizationId: this.organizationId, isActive: true },
      select: { id: true, code: true, name: true, type: true, balance: true },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    return accounts.map((a) => ({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debitTotal: 0,
      creditTotal: 0,
      netBalance: Number(a.balance),
    }));
  }

  private buildSection(title: string, lines: ReportAccountLine[], types: AccountType[]): ReportSection {
    const accounts = lines
      .filter((l) => types.includes(l.type))
      .filter((l) => l.netBalance !== 0)
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));

    const total = accounts.reduce((s, a) => s.plus(a.netBalance), new Decimal(0)).toNumber();

    return { title, accounts, total };
  }

  private buildBalanceSection(title: string, accounts: ReportAccountLine[], types: AccountType[]): ReportSection {
    const filtered = accounts
      .filter((a) => types.includes(a.type))
      .filter((a) => a.netBalance !== 0);

    const total = filtered.reduce((s, a) => s.plus(a.netBalance), new Decimal(0)).toNumber();

    return { title, accounts: filtered, total };
  }
}
