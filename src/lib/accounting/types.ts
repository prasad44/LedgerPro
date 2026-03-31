import type { AccountType, TransactionSource } from "@prisma/client";

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  classId?: string;
  locationId?: string;
  customerId?: string;
  vendorId?: string;
}

export interface CreateJournalEntryInput {
  date: Date;
  memo?: string;
  reference?: string;
  isAdjusting?: boolean;
  lines: JournalLineInput[];
  sourceType?: TransactionSource;
  sourceId?: string;
}

/**
 * Normal balance for each of the 15 QuickBooks account types.
 * DEBIT-normal: increases with debits (assets, expenses).
 * CREDIT-normal: increases with credits (liabilities, equity, revenue).
 */
export const ACCOUNT_NORMAL_BALANCES: Record<AccountType, "DEBIT" | "CREDIT"> = {
  BANK: "DEBIT",
  ACCOUNTS_RECEIVABLE: "DEBIT",
  OTHER_CURRENT_ASSET: "DEBIT",
  FIXED_ASSET: "DEBIT",
  OTHER_ASSET: "DEBIT",
  ACCOUNTS_PAYABLE: "CREDIT",
  CREDIT_CARD: "CREDIT",
  OTHER_CURRENT_LIABILITY: "CREDIT",
  LONG_TERM_LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  INCOME: "CREDIT",
  COST_OF_GOODS_SOLD: "DEBIT",
  EXPENSE: "DEBIT",
  OTHER_INCOME: "CREDIT",
  OTHER_EXPENSE: "DEBIT",
};

/** Account type categories for financial statements */
export const BALANCE_SHEET_TYPES: AccountType[] = [
  "BANK",
  "ACCOUNTS_RECEIVABLE",
  "OTHER_CURRENT_ASSET",
  "FIXED_ASSET",
  "OTHER_ASSET",
  "ACCOUNTS_PAYABLE",
  "CREDIT_CARD",
  "OTHER_CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
  "EQUITY",
];

export const INCOME_STATEMENT_TYPES: AccountType[] = [
  "INCOME",
  "COST_OF_GOODS_SOLD",
  "EXPENSE",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
];

export const ASSET_TYPES: AccountType[] = [
  "BANK",
  "ACCOUNTS_RECEIVABLE",
  "OTHER_CURRENT_ASSET",
  "FIXED_ASSET",
  "OTHER_ASSET",
];

export const LIABILITY_TYPES: AccountType[] = [
  "ACCOUNTS_PAYABLE",
  "CREDIT_CARD",
  "OTHER_CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
];

/** Human-readable labels for account types */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: "Bank",
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  OTHER_CURRENT_ASSET: "Other Current Asset",
  FIXED_ASSET: "Fixed Asset",
  OTHER_ASSET: "Other Asset",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  CREDIT_CARD: "Credit Card",
  OTHER_CURRENT_LIABILITY: "Other Current Liability",
  LONG_TERM_LIABILITY: "Long-Term Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  COST_OF_GOODS_SOLD: "Cost of Goods Sold",
  EXPENSE: "Expense",
  OTHER_INCOME: "Other Income",
  OTHER_EXPENSE: "Other Expense",
};

/** Group account types by financial statement section */
export const ACCOUNT_TYPE_GROUPS = {
  "Current Assets": ["BANK", "ACCOUNTS_RECEIVABLE", "OTHER_CURRENT_ASSET"] as AccountType[],
  "Long-Term Assets": ["FIXED_ASSET", "OTHER_ASSET"] as AccountType[],
  "Current Liabilities": ["ACCOUNTS_PAYABLE", "CREDIT_CARD", "OTHER_CURRENT_LIABILITY"] as AccountType[],
  "Long-Term Liabilities": ["LONG_TERM_LIABILITY"] as AccountType[],
  "Equity": ["EQUITY"] as AccountType[],
  "Income": ["INCOME"] as AccountType[],
  "Cost of Goods Sold": ["COST_OF_GOODS_SOLD"] as AccountType[],
  "Expenses": ["EXPENSE"] as AccountType[],
  "Other Income & Expense": ["OTHER_INCOME", "OTHER_EXPENSE"] as AccountType[],
};
