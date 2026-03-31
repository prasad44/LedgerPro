-- ============================================================
-- ROW-LEVEL SECURITY POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================
-- Append this SQL to the initial Prisma migration file after running:
--   npx prisma migrate dev --create-only --name init
--
-- Pattern: current_setting('app.current_tenant', TRUE) must match organizationId
-- The TRUE parameter returns NULL (not error) when the variable is unset,
-- which means NO rows are visible if tenant context is not set.
-- ============================================================

-- CHART OF ACCOUNTS
ALTER TABLE "ChartAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ChartAccount"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- JOURNAL ENTRIES
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalEntry"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "JournalLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "JournalLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- CUSTOMERS & AR
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Customer"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invoice"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InvoiceLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Payment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- VENDORS & AP
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Vendor"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Bill"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BillLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BillLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BillPayment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BillPayment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- EXPENSES
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Expense"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "ExpenseLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ExpenseLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- ITEMS
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Item"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- BANKING
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BankAccount"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BankTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BankTransaction"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Deposit" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Deposit"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Transfer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Transfer"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Reconciliation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Reconciliation"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- ESTIMATES
ALTER TABLE "Estimate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Estimate"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "EstimateLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EstimateLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- PURCHASE ORDERS
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseOrder"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseOrderLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- CREDIT MEMOS
ALTER TABLE "CreditMemo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CreditMemo"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "CreditMemoLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CreditMemoLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- BUDGETS
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Budget"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BudgetLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BudgetLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- SUPPORTING ENTITIES
ALTER TABLE "TaxRate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TaxRate"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "PaymentTerm" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentTerm"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Class"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Location"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Attachment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- MEMBERSHIP
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Membership"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

-- API & WEBHOOKS
ALTER TABLE "WebhookEndpoint" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WebhookEndpoint"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ApiKey"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));
