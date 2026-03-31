import type { PrismaClient, AccountType } from "@prisma/client";

interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  detailType: string;
  isSystemAccount?: boolean;
}

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // ── BANK (1000s) ──────────────────────────────────────────
  { code: "1000", name: "Checking Account", type: "BANK", detailType: "Checking" },
  { code: "1010", name: "Savings Account", type: "BANK", detailType: "Savings" },
  { code: "1020", name: "Petty Cash", type: "BANK", detailType: "CashOnHand" },

  // ── ACCOUNTS RECEIVABLE (1100s) ───────────────────────────
  { code: "1100", name: "Accounts Receivable", type: "ACCOUNTS_RECEIVABLE", detailType: "AccountsReceivable", isSystemAccount: true },

  // ── OTHER CURRENT ASSET (1200s) ───────────────────────────
  { code: "1200", name: "Undeposited Funds", type: "OTHER_CURRENT_ASSET", detailType: "UndepositedFunds", isSystemAccount: true },
  { code: "1210", name: "Inventory Asset", type: "OTHER_CURRENT_ASSET", detailType: "Inventory" },
  { code: "1220", name: "Prepaid Expenses", type: "OTHER_CURRENT_ASSET", detailType: "PrepaidExpenses" },
  { code: "1230", name: "Employee Advances", type: "OTHER_CURRENT_ASSET", detailType: "EmployeeCashAdvances" },

  // ── FIXED ASSET (1500s) ───────────────────────────────────
  { code: "1500", name: "Furniture & Equipment", type: "FIXED_ASSET", detailType: "FurnitureAndFixtures" },
  { code: "1510", name: "Vehicles", type: "FIXED_ASSET", detailType: "Vehicles" },
  { code: "1520", name: "Buildings", type: "FIXED_ASSET", detailType: "Buildings" },
  { code: "1530", name: "Leasehold Improvements", type: "FIXED_ASSET", detailType: "LeaseholdImprovements" },
  { code: "1540", name: "Land", type: "FIXED_ASSET", detailType: "Land" },
  { code: "1599", name: "Accumulated Depreciation", type: "FIXED_ASSET", detailType: "AccumulatedDepreciation" },

  // ── OTHER ASSET (1700s) ───────────────────────────────────
  { code: "1700", name: "Security Deposits", type: "OTHER_ASSET", detailType: "SecurityDeposits" },
  { code: "1710", name: "Goodwill", type: "OTHER_ASSET", detailType: "Goodwill" },
  { code: "1720", name: "Organization Costs", type: "OTHER_ASSET", detailType: "OrganizationalCosts" },

  // ── ACCOUNTS PAYABLE (2000s) ──────────────────────────────
  { code: "2000", name: "Accounts Payable", type: "ACCOUNTS_PAYABLE", detailType: "AccountsPayable", isSystemAccount: true },

  // ── CREDIT CARD (2100s) ───────────────────────────────────
  { code: "2100", name: "Company Credit Card", type: "CREDIT_CARD", detailType: "CreditCard" },

  // ── OTHER CURRENT LIABILITY (2200s) ───────────────────────
  { code: "2200", name: "Payroll Liabilities", type: "OTHER_CURRENT_LIABILITY", detailType: "PayrollTaxPayable" },
  { code: "2210", name: "Sales Tax Payable", type: "OTHER_CURRENT_LIABILITY", detailType: "SalesTaxPayable" },
  { code: "2220", name: "Accrued Expenses", type: "OTHER_CURRENT_LIABILITY", detailType: "AccruedLiabilities" },
  { code: "2230", name: "Current Portion of Long-Term Debt", type: "OTHER_CURRENT_LIABILITY", detailType: "CurrentPortionOfObligations" },
  { code: "2240", name: "Unearned Revenue", type: "OTHER_CURRENT_LIABILITY", detailType: "DeferredRevenue" },
  { code: "2250", name: "Line of Credit", type: "OTHER_CURRENT_LIABILITY", detailType: "LineOfCredit" },

  // ── LONG TERM LIABILITY (2500s) ───────────────────────────
  { code: "2500", name: "Long-Term Notes Payable", type: "LONG_TERM_LIABILITY", detailType: "NotesPayable" },
  { code: "2510", name: "Mortgage Payable", type: "LONG_TERM_LIABILITY", detailType: "NotesPayable" },

  // ── EQUITY (3000s) ────────────────────────────────────────
  { code: "3000", name: "Owner's Equity", type: "EQUITY", detailType: "OwnersEquity" },
  { code: "3100", name: "Owner's Investment / Paid-in Capital", type: "EQUITY", detailType: "PaidInCapital" },
  { code: "3200", name: "Owner's Draw", type: "EQUITY", detailType: "OwnersEquity" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY", detailType: "RetainedEarnings", isSystemAccount: true },
  { code: "3910", name: "Opening Balance Equity", type: "EQUITY", detailType: "OpeningBalanceEquity", isSystemAccount: true },

  // ── INCOME (4000s) ────────────────────────────────────────
  { code: "4000", name: "Sales Revenue", type: "INCOME", detailType: "SalesOfProductIncome" },
  { code: "4010", name: "Service Revenue", type: "INCOME", detailType: "ServiceFeeIncome" },
  { code: "4020", name: "Discounts Given", type: "INCOME", detailType: "DiscountsRefundsGiven" },
  { code: "4030", name: "Shipping & Delivery Income", type: "INCOME", detailType: "OtherPrimaryIncome" },
  { code: "4040", name: "Returns & Allowances", type: "INCOME", detailType: "DiscountsRefundsGiven" },

  // ── COST OF GOODS SOLD (5000s) ────────────────────────────
  { code: "5000", name: "Cost of Goods Sold", type: "COST_OF_GOODS_SOLD", detailType: "SuppliesMaterialsCogs" },
  { code: "5010", name: "Purchases", type: "COST_OF_GOODS_SOLD", detailType: "SuppliesMaterialsCogs" },
  { code: "5020", name: "Freight & Delivery - COGS", type: "COST_OF_GOODS_SOLD", detailType: "FreightAndDeliveryCost" },
  { code: "5030", name: "Subcontractors - COGS", type: "COST_OF_GOODS_SOLD", detailType: "OtherCostsOfServiceCOS" },

  // ── EXPENSE (6000s) ───────────────────────────────────────
  { code: "6000", name: "Advertising & Marketing", type: "EXPENSE", detailType: "AdvertisingPromotional" },
  { code: "6010", name: "Auto Expense", type: "EXPENSE", detailType: "Auto" },
  { code: "6020", name: "Bank Service Charges", type: "EXPENSE", detailType: "BankCharges" },
  { code: "6030", name: "Computer & Internet", type: "EXPENSE", detailType: "OfficeGeneralAdministrativeExpenses" },
  { code: "6040", name: "Depreciation Expense", type: "EXPENSE", detailType: "Depreciation" },
  { code: "6050", name: "Dues & Subscriptions", type: "EXPENSE", detailType: "DuesSubscriptions" },
  { code: "6060", name: "Insurance", type: "EXPENSE", detailType: "Insurance" },
  { code: "6070", name: "Interest Expense", type: "EXPENSE", detailType: "InterestPaid" },
  { code: "6080", name: "Legal & Professional Fees", type: "EXPENSE", detailType: "LegalProfessionalFees" },
  { code: "6090", name: "Meals & Entertainment", type: "EXPENSE", detailType: "EntertainmentMeals" },
  { code: "6100", name: "Office Supplies", type: "EXPENSE", detailType: "OfficeExpenses" },
  { code: "6110", name: "Payroll Expenses", type: "EXPENSE", detailType: "PayrollExpenses" },
  { code: "6120", name: "Postage & Shipping", type: "EXPENSE", detailType: "ShippingFreightDelivery" },
  { code: "6130", name: "Rent Expense", type: "EXPENSE", detailType: "RentOrLeaseOfBuildings" },
  { code: "6140", name: "Repairs & Maintenance", type: "EXPENSE", detailType: "RepairMaintenance" },
  { code: "6150", name: "Taxes & Licenses", type: "EXPENSE", detailType: "TaxesPaid" },
  { code: "6160", name: "Telephone", type: "EXPENSE", detailType: "Utilities" },
  { code: "6170", name: "Travel Expense", type: "EXPENSE", detailType: "Travel" },
  { code: "6180", name: "Utilities", type: "EXPENSE", detailType: "Utilities" },
  { code: "6190", name: "Miscellaneous Expense", type: "EXPENSE", detailType: "OtherMiscellaneousExpense" },

  // ── OTHER INCOME (7000s) ──────────────────────────────────
  { code: "7000", name: "Interest Income", type: "OTHER_INCOME", detailType: "InterestEarned" },
  { code: "7010", name: "Gain on Sale of Assets", type: "OTHER_INCOME", detailType: "GainLossOnSaleOfFixedAssets" },
  { code: "7020", name: "Other Income", type: "OTHER_INCOME", detailType: "OtherInvestmentIncome" },
  { code: "7030", name: "Rental Income", type: "OTHER_INCOME", detailType: "RentalIncome" },

  // ── OTHER EXPENSE (8000s) ─────────────────────────────────
  { code: "8000", name: "Penalties & Fines", type: "OTHER_EXPENSE", detailType: "Penalties" },
  { code: "8010", name: "Loss on Sale of Assets", type: "OTHER_EXPENSE", detailType: "OtherMiscellaneousExpense" },
  { code: "8020", name: "Other Expense", type: "OTHER_EXPENSE", detailType: "OtherMiscellaneousExpense" },
];

export async function seedDefaultAccounts(
  prisma: PrismaClient,
  organizationId: string
): Promise<void> {
  const accounts = DEFAULT_ACCOUNTS.map((acct) => ({
    organizationId,
    code: acct.code,
    name: acct.name,
    type: acct.type,
    detailType: acct.detailType,
    isSystemAccount: acct.isSystemAccount ?? false,
  }));

  await prisma.chartAccount.createMany({ data: accounts });
}

export async function seedDefaultPaymentTerms(
  prisma: PrismaClient,
  organizationId: string
): Promise<void> {
  const terms = [
    { organizationId, name: "Due on Receipt", daysUntilDue: 0 },
    { organizationId, name: "Net 10", daysUntilDue: 10 },
    { organizationId, name: "Net 15", daysUntilDue: 15 },
    { organizationId, name: "Net 30", daysUntilDue: 30 },
    { organizationId, name: "Net 45", daysUntilDue: 45 },
    { organizationId, name: "Net 60", daysUntilDue: 60 },
    { organizationId, name: "Net 90", daysUntilDue: 90 },
  ];

  await prisma.paymentTerm.createMany({ data: terms });
}
