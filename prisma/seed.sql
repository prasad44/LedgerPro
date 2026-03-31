-- Seed test user: prasad@gmail.com / 12345678

-- Create user
INSERT INTO "User" (id, name, email, "passwordHash", "createdAt", "updatedAt")
VALUES ('usr_prasad001', 'Prasad', 'prasad@gmail.com', '$2b$10$wnBjZDQRgtaah4jkD1b7C.U5SUeVeBbG/E6uEgZY9sd9taVmaqfq.', NOW(), NOW());

-- Create organization (Enterprise tier)
INSERT INTO "Organization" (id, name, slug, currency, "fiscalYearStart", "subscriptionTier", "subscriptionStatus", "trialEndsAt", "transactionCount", "createdAt", "updatedAt")
VALUES ('org_prasad01', 'Prasad''s Company', 'org-prasad01', 'USD', 1, 'ENTERPRISE', 'ACTIVE', NOW() + INTERVAL '90 days', 0, NOW(), NOW());

-- Link user to org as OWNER
INSERT INTO "Membership" (id, role, "userId", "organizationId", "isActive", "invitedAt", "joinedAt")
VALUES ('mem_prasad01', 'OWNER', 'usr_prasad001', 'org_prasad01', true, NOW(), NOW());

-- Seed Chart of Accounts
INSERT INTO "ChartAccount" (id, "organizationId", code, name, type, "detailType", "isSystemAccount", balance, "createdAt", "updatedAt") VALUES
('acc_1000', 'org_prasad01', '1000', 'Checking Account', 'BANK', 'Checking', false, 0, NOW(), NOW()),
('acc_1010', 'org_prasad01', '1010', 'Savings Account', 'BANK', 'Savings', false, 0, NOW(), NOW()),
('acc_1020', 'org_prasad01', '1020', 'Petty Cash', 'BANK', 'CashOnHand', false, 0, NOW(), NOW()),
('acc_1100', 'org_prasad01', '1100', 'Accounts Receivable', 'ACCOUNTS_RECEIVABLE', 'AccountsReceivable', true, 0, NOW(), NOW()),
('acc_1200', 'org_prasad01', '1200', 'Undeposited Funds', 'OTHER_CURRENT_ASSET', 'UndepositedFunds', true, 0, NOW(), NOW()),
('acc_1210', 'org_prasad01', '1210', 'Inventory Asset', 'OTHER_CURRENT_ASSET', 'Inventory', false, 0, NOW(), NOW()),
('acc_1220', 'org_prasad01', '1220', 'Prepaid Expenses', 'OTHER_CURRENT_ASSET', 'PrepaidExpenses', false, 0, NOW(), NOW()),
('acc_1500', 'org_prasad01', '1500', 'Furniture & Equipment', 'FIXED_ASSET', 'FurnitureAndFixtures', false, 0, NOW(), NOW()),
('acc_1510', 'org_prasad01', '1510', 'Vehicles', 'FIXED_ASSET', 'Vehicles', false, 0, NOW(), NOW()),
('acc_1599', 'org_prasad01', '1599', 'Accumulated Depreciation', 'FIXED_ASSET', 'AccumulatedDepreciation', false, 0, NOW(), NOW()),
('acc_1700', 'org_prasad01', '1700', 'Security Deposits', 'OTHER_ASSET', 'SecurityDeposits', false, 0, NOW(), NOW()),
('acc_2000', 'org_prasad01', '2000', 'Accounts Payable', 'ACCOUNTS_PAYABLE', 'AccountsPayable', true, 0, NOW(), NOW()),
('acc_2100', 'org_prasad01', '2100', 'Company Credit Card', 'CREDIT_CARD', 'CreditCard', false, 0, NOW(), NOW()),
('acc_2200', 'org_prasad01', '2200', 'Payroll Liabilities', 'OTHER_CURRENT_LIABILITY', 'PayrollTaxPayable', false, 0, NOW(), NOW()),
('acc_2210', 'org_prasad01', '2210', 'Sales Tax Payable', 'OTHER_CURRENT_LIABILITY', 'SalesTaxPayable', false, 0, NOW(), NOW()),
('acc_2500', 'org_prasad01', '2500', 'Long-Term Notes Payable', 'LONG_TERM_LIABILITY', 'NotesPayable', false, 0, NOW(), NOW()),
('acc_3000', 'org_prasad01', '3000', 'Owner''s Equity', 'EQUITY', 'OwnersEquity', false, 0, NOW(), NOW()),
('acc_3100', 'org_prasad01', '3100', 'Paid-in Capital', 'EQUITY', 'PaidInCapital', false, 0, NOW(), NOW()),
('acc_3900', 'org_prasad01', '3900', 'Retained Earnings', 'EQUITY', 'RetainedEarnings', true, 0, NOW(), NOW()),
('acc_3910', 'org_prasad01', '3910', 'Opening Balance Equity', 'EQUITY', 'OpeningBalanceEquity', true, 0, NOW(), NOW()),
('acc_4000', 'org_prasad01', '4000', 'Sales Revenue', 'INCOME', 'SalesOfProductIncome', false, 0, NOW(), NOW()),
('acc_4010', 'org_prasad01', '4010', 'Service Revenue', 'INCOME', 'ServiceFeeIncome', false, 0, NOW(), NOW()),
('acc_4020', 'org_prasad01', '4020', 'Discounts Given', 'INCOME', 'DiscountsRefundsGiven', false, 0, NOW(), NOW()),
('acc_5000', 'org_prasad01', '5000', 'Cost of Goods Sold', 'COST_OF_GOODS_SOLD', 'SuppliesMaterialsCogs', false, 0, NOW(), NOW()),
('acc_5010', 'org_prasad01', '5010', 'Purchases', 'COST_OF_GOODS_SOLD', 'SuppliesMaterialsCogs', false, 0, NOW(), NOW()),
('acc_6000', 'org_prasad01', '6000', 'Advertising & Marketing', 'EXPENSE', 'AdvertisingPromotional', false, 0, NOW(), NOW()),
('acc_6020', 'org_prasad01', '6020', 'Bank Service Charges', 'EXPENSE', 'BankCharges', false, 0, NOW(), NOW()),
('acc_6060', 'org_prasad01', '6060', 'Insurance', 'EXPENSE', 'Insurance', false, 0, NOW(), NOW()),
('acc_6080', 'org_prasad01', '6080', 'Legal & Professional Fees', 'EXPENSE', 'LegalProfessionalFees', false, 0, NOW(), NOW()),
('acc_6100', 'org_prasad01', '6100', 'Office Supplies', 'EXPENSE', 'OfficeExpenses', false, 0, NOW(), NOW()),
('acc_6110', 'org_prasad01', '6110', 'Payroll Expenses', 'EXPENSE', 'PayrollExpenses', false, 0, NOW(), NOW()),
('acc_6130', 'org_prasad01', '6130', 'Rent Expense', 'EXPENSE', 'RentOrLeaseOfBuildings', false, 0, NOW(), NOW()),
('acc_6180', 'org_prasad01', '6180', 'Utilities', 'EXPENSE', 'Utilities', false, 0, NOW(), NOW()),
('acc_6190', 'org_prasad01', '6190', 'Miscellaneous Expense', 'EXPENSE', 'OtherMiscellaneousExpense', false, 0, NOW(), NOW()),
('acc_7000', 'org_prasad01', '7000', 'Interest Income', 'OTHER_INCOME', 'InterestEarned', false, 0, NOW(), NOW()),
('acc_8000', 'org_prasad01', '8000', 'Penalties & Fines', 'OTHER_EXPENSE', 'Penalties', false, 0, NOW(), NOW());

-- Seed Payment Terms
INSERT INTO "PaymentTerm" (id, "organizationId", name, "daysUntilDue", "isActive") VALUES
('pt_receipt', 'org_prasad01', 'Due on Receipt', 0, true),
('pt_net15', 'org_prasad01', 'Net 15', 15, true),
('pt_net30', 'org_prasad01', 'Net 30', 30, true),
('pt_net60', 'org_prasad01', 'Net 60', 60, true);
