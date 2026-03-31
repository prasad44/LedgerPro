# QuickBooks Desktop Clone — SaaS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant SaaS accounting platform modeled after QuickBooks Desktop, with Paddle subscriptions, API-first architecture, and AI integration.

**Architecture:** Next.js 15 App Router for both frontend and API. PostgreSQL on Railway with Row-Level Security for multi-tenant isolation. Prisma ORM with Client Extensions for tenant-scoped queries. Auth.js v5 (JWT strategy) with organizationId embedded in tokens. Versioned REST API (`/api/v1/`) designed for web, mobile, and third-party consumption.

**Tech Stack:**
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- Backend: Next.js API Routes (App Router), Prisma ORM 6
- Database: PostgreSQL 16 on Railway
- Auth: Auth.js v5 (NextAuth) with JWT strategy
- Payments: Paddle Billing v2
- AI: Claude API (@anthropic-ai/sdk)
- State: Zustand (client), React Query / SWR (server)
- Testing: Vitest + Testing Library + Playwright (E2E)
- Deployment: Vercel (frontend) + Railway (database)

---

## Subscription Tiers

| Feature | Starter ($19/mo) | Standard ($39/mo) | Premium ($69/mo) | Enterprise ($149/mo) |
|---|---|---|---|---|
| Users | 1 | 3 | 5 | 25 |
| Chart of Accounts | Yes | Yes | Yes | Yes |
| Journal Entries | Yes | Yes | Yes | Yes |
| Basic Invoicing | Yes | Yes | Yes | Yes |
| Estimates & Credit Memos | — | Yes | Yes | Yes |
| Expense Tracking | Basic | Full | Full | Full |
| Bills & Bill Payments | — | Yes | Yes | Yes |
| Customer & Vendor Centers | — | Yes | Yes | Yes |
| Bank Reconciliation | — | Yes | Yes | Yes |
| Purchase Orders | — | — | Yes | Yes |
| Inventory Tracking | — | — | Yes | Yes |
| Multi-Currency | — | — | Yes | Yes |
| Class/Location Tracking | — | — | Yes | Yes |
| Budgets & Forecasts | — | — | Yes | Yes |
| Advanced Inventory | — | — | — | Yes |
| Advanced Reporting (ODBC) | — | — | — | Yes |
| Custom User Roles | — | — | — | Yes (14 predefined) |
| API Access & Webhooks | — | — | — | Yes |
| AI-Powered Features | — | — | — | Yes |
| Reports | 5 core | 20 | 50+ | 200+ |
| Transactions/month | 500 | 5,000 | 25,000 | Unlimited |
| Support | Email | Email + Chat | Priority | Dedicated |

---

## Implementation Phases

| Phase | Name | Tasks | Status |
|---|---|---|---|
| 1 | Project Foundation | Tasks 1–8 | — |
| 2 | Core Accounting Engine | Tasks 9–14 | — |
| 3 | Money In (Customers & Invoicing) | Tasks 15–20 | — |
| 4 | Money Out (Vendors & Bills) | Tasks 21–25 | — |
| 5 | Banking | Tasks 26–29 | — |
| 6 | Financial Reports | Tasks 30–34 | — |
| 7 | Paddle Subscriptions & Feature Gating | Tasks 35–39 | — |
| 8 | API, Webhooks & Integrations | Tasks 40–43 | — |
| 9 | AI Integration | Tasks 44–45 | — |

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, etc.

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd "/c/PD/SaaS Class/Accounting"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Accept defaults. This creates the standard Next.js 15 project structure.

**Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta
npm install @tanstack/react-query zustand
npm install zod date-fns decimal.js nanoid
npm install -D @types/node vitest @testing-library/react @testing-library/jest-dom
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

Select: New York style, Zinc base color, CSS variables = yes.

**Step 4: Add commonly needed shadcn components**

```bash
npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet sidebar table tabs toast tooltip badge command popover calendar form scroll-area avatar checkbox radio-group switch textarea data-table
```

**Step 5: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui"
```

---

### Task 2: Configure Project Structure

**Files:**
- Create: `src/lib/`, `src/hooks/`, `src/stores/`, `src/types/`, `.env.local`, `.env.example`

**Step 1: Create directory structure**

```bash
mkdir -p src/lib/{db,auth,tenant,accounting,paddle,ai,webhooks,api}
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/types
mkdir -p src/components/{layout,accounting,forms}
mkdir -p src/app/\(auth\)/{login,register,forgot-password}
mkdir -p src/app/\(dashboard\)/{accounts,banking,customers,vendors,invoices,bills,journal,reports,items,settings,estimates,payments,expenses,purchase-orders,reconciliation,deposits}
mkdir -p src/app/api/v1/{accounts,transactions,invoices,customers,vendors,reports,journal-entries,items,banking}
mkdir -p src/app/api/{auth,webhooks/paddle}
mkdir -p tests/{unit,integration,e2e}
```

**Step 2: Create environment files**

`.env.example`:
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/accounting?schema=public"

# Auth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Paddle
NEXT_PUBLIC_PADDLE_ENVIRONMENT="sandbox"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="test_xxx"
PADDLE_API_KEY="pdl_sdbx_apikey_xxx"
PADDLE_WEBHOOK_SECRET="pdl_ntfset_xxx"
NEXT_PUBLIC_PADDLE_PRICE_STARTER="pri_xxx"
NEXT_PUBLIC_PADDLE_PRICE_STANDARD="pri_xxx"
NEXT_PUBLIC_PADDLE_PRICE_PREMIUM="pri_xxx"
NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE="pri_xxx"

# AI
ANTHROPIC_API_KEY="sk-ant-xxx"

# App
NEXT_PUBLIC_APP_NAME="LedgerPro"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`.env.local` — copy from `.env.example` with actual values.

**Step 3: Create `.gitignore` additions**

Append to `.gitignore`:
```
.env.local
.env.production
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: establish project directory structure and env config"
```

---

### Task 3: Prisma Schema — Core Models

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Initialize Prisma**

```bash
npx prisma init
```

**Step 2: Write the complete core schema**

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// GLOBAL TABLES (no organizationId, no RLS)
// ============================================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      OAuthAccount[]
  sessions      Session[]
  memberships   Membership[]
}

model OAuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("Account")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================
// ORGANIZATION / MULTI-TENANCY
// ============================================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logo      String?
  currency  String   @default("USD")
  fiscalYearStart Int @default(1) // month 1-12
  industry  String?
  address   String?
  phone     String?
  email     String?
  website   String?
  taxId     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Subscription
  subscriptionTier       SubscriptionTier @default(STARTER)
  subscriptionStatus     SubscriptionStatus @default(TRIALING)
  paddleCustomerId       String?
  paddleSubscriptionId   String?
  subscriptionStartDate  DateTime?
  subscriptionEndDate    DateTime?
  trialEndsAt            DateTime?

  // Usage tracking
  transactionCount       Int @default(0)
  transactionResetDate   DateTime?

  members          Membership[]
  accounts         Account[]
  journalEntries   JournalEntry[]
  journalLines     JournalLine[]
  customers        Customer[]
  vendors          Vendor[]
  invoices         Invoice[]
  invoiceLines     InvoiceLine[]
  payments         Payment[]
  bills            Bill[]
  billLines        BillLine[]
  billPayments     BillPayment[]
  expenses         Expense[]
  expenseLines     ExpenseLine[]
  items            Item[]
  bankAccounts     BankAccount[]
  bankTransactions BankTransaction[]
  deposits         Deposit[]
  transfers        Transfer[]
  estimates        Estimate[]
  estimateLines    EstimateLine[]
  purchaseOrders   PurchaseOrder[]
  purchaseOrderLines PurchaseOrderLine[]
  creditMemos      CreditMemo[]
  creditMemoLines  CreditMemoLine[]
  reconciliations  Reconciliation[]
  budgets          Budget[]
  budgetLines      BudgetLine[]
  taxRates         TaxRate[]
  paymentTerms     PaymentTerm[]
  classes          Class[]
  locations        Location[]
  attachments      Attachment[]
  auditLogs        AuditLog[]
  webhookEndpoints WebhookEndpoint[]
  apiKeys          ApiKey[]

  @@index([slug])
}

model Membership {
  id             String   @id @default(cuid())
  role           OrgRole  @default(MEMBER)
  userId         String
  organizationId String
  isActive       Boolean  @default(true)
  invitedAt      DateTime @default(now())
  joinedAt       DateTime?

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
}

// ============================================================
// CHART OF ACCOUNTS
// ============================================================

model Account {
  id             String      @id @default(cuid())
  organizationId String
  code           String?     // account number e.g. "1000"
  name           String
  type           AccountType
  detailType     String?
  description    String?
  parentId       String?     // for sub-accounts
  isActive       Boolean     @default(true)
  isSystemAccount Boolean    @default(false)  // e.g. Retained Earnings, Undeposited Funds
  taxLineMapping String?
  balance        Decimal     @default(0) @db.Decimal(19, 4)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  parent         Account?     @relation("AccountHierarchy", fields: [parentId], references: [id])
  children       Account[]    @relation("AccountHierarchy")

  journalLines   JournalLine[]
  invoiceLines   InvoiceLine[]
  billLines      BillLine[]
  expenseLines   ExpenseLine[]

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, type])
  @@index([organizationId, isActive])
}

// ============================================================
// JOURNAL ENTRIES (Double-Entry Bookkeeping Core)
// ============================================================

model JournalEntry {
  id             String           @id @default(cuid())
  organizationId String
  entryNumber    String           // auto-generated: JE-0001
  date           DateTime
  memo           String?
  reference      String?          // external reference
  isAdjusting    Boolean          @default(false)
  isClosing      Boolean          @default(false)
  isReversing    Boolean          @default(false)
  reversalOfId   String?          // links to original JE if this is a reversal
  sourceType     TransactionSource? // what created this JE
  sourceId       String?          // ID of the source document
  status         JournalStatus    @default(DRAFT)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  postedAt       DateTime?

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lines          JournalLine[]

  @@unique([organizationId, entryNumber])
  @@index([organizationId])
  @@index([organizationId, date])
  @@index([organizationId, status])
  @@index([organizationId, sourceType, sourceId])
}

model JournalLine {
  id             String   @id @default(cuid())
  organizationId String
  journalEntryId String
  accountId      String
  description    String?
  debit          Decimal  @default(0) @db.Decimal(19, 4)
  credit         Decimal  @default(0) @db.Decimal(19, 4)
  classId        String?
  locationId     String?
  customerId     String?  // for sub-ledger posting
  vendorId       String?  // for sub-ledger posting

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])

  @@index([organizationId])
  @@index([journalEntryId])
  @@index([accountId])
}

// ============================================================
// CUSTOMERS & ACCOUNTS RECEIVABLE
// ============================================================

model Customer {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  company        String?
  email          String?
  phone          String?
  mobile         String?
  fax            String?
  website        String?
  billingAddress  Json?   // { line1, line2, city, state, zip, country }
  shippingAddress Json?
  taxId          String?
  notes          String?
  paymentTermsId String?
  creditLimit    Decimal? @db.Decimal(19, 4)
  balance        Decimal  @default(0) @db.Decimal(19, 4) // running AR balance
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  paymentTerms   PaymentTerm?  @relation(fields: [paymentTermsId], references: [id])
  invoices       Invoice[]
  payments       Payment[]
  estimates      Estimate[]
  creditMemos    CreditMemo[]

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([organizationId, name])
  @@index([organizationId, isActive])
}

model Invoice {
  id             String        @id @default(cuid())
  organizationId String
  invoiceNumber  String        // INV-0001
  customerId     String
  date           DateTime
  dueDate        DateTime
  status         InvoiceStatus @default(DRAFT)
  subtotal       Decimal       @db.Decimal(19, 4)
  taxAmount      Decimal       @default(0) @db.Decimal(19, 4)
  discountAmount Decimal       @default(0) @db.Decimal(19, 4)
  totalAmount    Decimal       @db.Decimal(19, 4)
  amountPaid     Decimal       @default(0) @db.Decimal(19, 4)
  amountDue      Decimal       @db.Decimal(19, 4)
  terms          String?
  memo           String?
  footer         String?
  journalEntryId String?
  sentAt         DateTime?
  paidAt         DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer      @relation(fields: [customerId], references: [id])
  lines          InvoiceLine[]
  payments       Payment[]

  @@unique([organizationId, invoiceNumber])
  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, customerId])
  @@index([organizationId, dueDate])
}

model InvoiceLine {
  id             String  @id @default(cuid())
  organizationId String
  invoiceId      String
  itemId         String?
  accountId      String
  description    String?
  quantity       Decimal @default(1) @db.Decimal(19, 4)
  unitPrice      Decimal @db.Decimal(19, 4)
  amount         Decimal @db.Decimal(19, 4)
  taxRateId      String?
  taxAmount      Decimal @default(0) @db.Decimal(19, 4)
  sortOrder      Int     @default(0)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invoice        Invoice      @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])
  item           Item?        @relation(fields: [itemId], references: [id])

  @@index([organizationId])
  @@index([invoiceId])
}

model Payment {
  id              String        @id @default(cuid())
  organizationId  String
  paymentNumber   String        // PMT-0001
  customerId      String
  invoiceId       String?
  date            DateTime
  amount          Decimal       @db.Decimal(19, 4)
  method          PaymentMethod @default(OTHER)
  reference       String?       // check number, transaction ID
  depositToAccountId String?
  memo            String?
  journalEntryId  String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer        Customer      @relation(fields: [customerId], references: [id])
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])

  @@unique([organizationId, paymentNumber])
  @@index([organizationId])
  @@index([organizationId, customerId])
}

// ============================================================
// VENDORS & ACCOUNTS PAYABLE
// ============================================================

model Vendor {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  company        String?
  email          String?
  phone          String?
  address        Json?
  taxId          String?
  notes          String?
  paymentTermsId String?
  balance        Decimal  @default(0) @db.Decimal(19, 4) // running AP balance
  is1099         Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  paymentTerms   PaymentTerm? @relation(fields: [paymentTermsId], references: [id])
  bills          Bill[]
  billPayments   BillPayment[]
  expenses       Expense[]
  purchaseOrders PurchaseOrder[]

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([organizationId, name])
}

model Bill {
  id             String     @id @default(cuid())
  organizationId String
  billNumber     String     // BILL-0001
  vendorId       String
  date           DateTime
  dueDate        DateTime
  status         BillStatus @default(UNPAID)
  subtotal       Decimal    @db.Decimal(19, 4)
  taxAmount      Decimal    @default(0) @db.Decimal(19, 4)
  totalAmount    Decimal    @db.Decimal(19, 4)
  amountPaid     Decimal    @default(0) @db.Decimal(19, 4)
  amountDue      Decimal    @db.Decimal(19, 4)
  vendorRef      String?    // vendor's invoice number
  memo           String?
  journalEntryId String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vendor         Vendor       @relation(fields: [vendorId], references: [id])
  lines          BillLine[]
  payments       BillPayment[]

  @@unique([organizationId, billNumber])
  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, vendorId])
  @@index([organizationId, dueDate])
}

model BillLine {
  id             String  @id @default(cuid())
  organizationId String
  billId         String
  itemId         String?
  accountId      String
  description    String?
  quantity       Decimal @default(1) @db.Decimal(19, 4)
  unitPrice      Decimal @db.Decimal(19, 4)
  amount         Decimal @db.Decimal(19, 4)
  taxRateId      String?
  taxAmount      Decimal @default(0) @db.Decimal(19, 4)
  sortOrder      Int     @default(0)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bill           Bill         @relation(fields: [billId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])
  item           Item?        @relation(fields: [itemId], references: [id])

  @@index([organizationId])
  @@index([billId])
}

model BillPayment {
  id             String        @id @default(cuid())
  organizationId String
  paymentNumber  String
  vendorId       String
  billId         String
  date           DateTime
  amount         Decimal       @db.Decimal(19, 4)
  method         PaymentMethod @default(CHECK)
  bankAccountId  String?
  reference      String?
  memo           String?
  journalEntryId String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vendor         Vendor       @relation(fields: [vendorId], references: [id])
  bill           Bill         @relation(fields: [billId], references: [id])

  @@unique([organizationId, paymentNumber])
  @@index([organizationId])
}

// ============================================================
// EXPENSES
// ============================================================

model Expense {
  id             String        @id @default(cuid())
  organizationId String
  expenseNumber  String
  vendorId       String?
  date           DateTime
  paymentMethod  PaymentMethod @default(OTHER)
  bankAccountId  String?
  reference      String?
  totalAmount    Decimal       @db.Decimal(19, 4)
  memo           String?
  journalEntryId String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vendor         Vendor?      @relation(fields: [vendorId], references: [id])
  lines          ExpenseLine[]

  @@unique([organizationId, expenseNumber])
  @@index([organizationId])
  @@index([organizationId, date])
}

model ExpenseLine {
  id             String  @id @default(cuid())
  organizationId String
  expenseId      String
  accountId      String
  description    String?
  amount         Decimal @db.Decimal(19, 4)
  classId        String?
  locationId     String?
  sortOrder      Int     @default(0)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  expense        Expense      @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])

  @@index([organizationId])
  @@index([expenseId])
}

// ============================================================
// ITEMS (Products & Services)
// ============================================================

model Item {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  sku            String?
  type           ItemType @default(SERVICE)
  description    String?
  salesPrice     Decimal? @db.Decimal(19, 4)
  purchasePrice  Decimal? @db.Decimal(19, 4)
  incomeAccountId   String?
  expenseAccountId  String?
  assetAccountId    String? // for inventory items
  taxable        Boolean  @default(true)
  isActive       Boolean  @default(true)
  trackInventory Boolean  @default(false)
  quantityOnHand Decimal  @default(0) @db.Decimal(19, 4)
  reorderPoint   Decimal? @db.Decimal(19, 4)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invoiceLines   InvoiceLine[]
  billLines      BillLine[]

  @@unique([organizationId, sku])
  @@index([organizationId])
  @@index([organizationId, type])
  @@index([organizationId, name])
}

// ============================================================
// BANKING
// ============================================================

model BankAccount {
  id             String   @id @default(cuid())
  organizationId String
  accountId      String   // links to Account (Chart of Accounts)
  bankName       String?
  accountNumber  String?  // last 4 digits only
  routingNumber  String?  // masked
  currency       String   @default("USD")
  currentBalance Decimal  @default(0) @db.Decimal(19, 4)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  transactions    BankTransaction[]
  reconciliations Reconciliation[]

  @@index([organizationId])
}

model BankTransaction {
  id             String                @id @default(cuid())
  organizationId String
  bankAccountId  String
  date           DateTime
  description    String
  amount         Decimal               @db.Decimal(19, 4) // positive = deposit, negative = withdrawal
  type           BankTransactionType
  reference      String?
  isReconciled   Boolean               @default(false)
  matchedJournalEntryId String?
  category       String?
  createdAt      DateTime              @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bankAccount    BankAccount  @relation(fields: [bankAccountId], references: [id])

  @@index([organizationId])
  @@index([bankAccountId, date])
  @@index([organizationId, isReconciled])
}

model Deposit {
  id             String   @id @default(cuid())
  organizationId String
  depositNumber  String
  bankAccountId  String
  date           DateTime
  totalAmount    Decimal  @db.Decimal(19, 4)
  memo           String?
  journalEntryId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, depositNumber])
  @@index([organizationId])
}

model Transfer {
  id              String   @id @default(cuid())
  organizationId  String
  transferNumber  String
  fromAccountId   String
  toAccountId     String
  amount          Decimal  @db.Decimal(19, 4)
  date            DateTime
  memo            String?
  journalEntryId  String?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, transferNumber])
  @@index([organizationId])
}

model Reconciliation {
  id              String              @id @default(cuid())
  organizationId  String
  bankAccountId   String
  statementDate   DateTime
  statementBalance Decimal            @db.Decimal(19, 4)
  clearedBalance  Decimal             @db.Decimal(19, 4)
  difference      Decimal             @db.Decimal(19, 4)
  status          ReconciliationStatus @default(IN_PROGRESS)
  completedAt     DateTime?
  createdAt       DateTime            @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bankAccount     BankAccount  @relation(fields: [bankAccountId], references: [id])

  @@index([organizationId])
}

// ============================================================
// ESTIMATES
// ============================================================

model Estimate {
  id             String         @id @default(cuid())
  organizationId String
  estimateNumber String
  customerId     String
  date           DateTime
  expiryDate     DateTime?
  status         EstimateStatus @default(DRAFT)
  subtotal       Decimal        @db.Decimal(19, 4)
  taxAmount      Decimal        @default(0) @db.Decimal(19, 4)
  totalAmount    Decimal        @db.Decimal(19, 4)
  memo           String?
  convertedToInvoiceId String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer       @relation(fields: [customerId], references: [id])
  lines          EstimateLine[]

  @@unique([organizationId, estimateNumber])
  @@index([organizationId])
}

model EstimateLine {
  id             String  @id @default(cuid())
  organizationId String
  estimateId     String
  itemId         String?
  description    String?
  quantity       Decimal @default(1) @db.Decimal(19, 4)
  unitPrice      Decimal @db.Decimal(19, 4)
  amount         Decimal @db.Decimal(19, 4)
  sortOrder      Int     @default(0)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  estimate       Estimate     @relation(fields: [estimateId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([estimateId])
}

// ============================================================
// PURCHASE ORDERS
// ============================================================

model PurchaseOrder {
  id             String        @id @default(cuid())
  organizationId String
  poNumber       String
  vendorId       String
  date           DateTime
  expectedDate   DateTime?
  status         POStatus      @default(DRAFT)
  subtotal       Decimal       @db.Decimal(19, 4)
  taxAmount      Decimal       @default(0) @db.Decimal(19, 4)
  totalAmount    Decimal       @db.Decimal(19, 4)
  memo           String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vendor         Vendor             @relation(fields: [vendorId], references: [id])
  lines          PurchaseOrderLine[]

  @@unique([organizationId, poNumber])
  @@index([organizationId])
}

model PurchaseOrderLine {
  id             String  @id @default(cuid())
  organizationId String
  purchaseOrderId String
  itemId         String?
  description    String?
  quantity       Decimal @default(1) @db.Decimal(19, 4)
  unitPrice      Decimal @db.Decimal(19, 4)
  amount         Decimal @db.Decimal(19, 4)
  receivedQty    Decimal @default(0) @db.Decimal(19, 4)
  sortOrder      Int     @default(0)

  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  purchaseOrder  PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([purchaseOrderId])
}

// ============================================================
// CREDIT MEMOS
// ============================================================

model CreditMemo {
  id             String          @id @default(cuid())
  organizationId String
  creditNumber   String
  customerId     String
  date           DateTime
  status         CreditMemoStatus @default(DRAFT)
  subtotal       Decimal         @db.Decimal(19, 4)
  taxAmount      Decimal         @default(0) @db.Decimal(19, 4)
  totalAmount    Decimal         @db.Decimal(19, 4)
  amountUsed     Decimal         @default(0) @db.Decimal(19, 4)
  amountRemaining Decimal        @db.Decimal(19, 4)
  memo           String?
  journalEntryId String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer        @relation(fields: [customerId], references: [id])
  lines          CreditMemoLine[]

  @@unique([organizationId, creditNumber])
  @@index([organizationId])
}

model CreditMemoLine {
  id             String  @id @default(cuid())
  organizationId String
  creditMemoId   String
  itemId         String?
  description    String?
  quantity       Decimal @default(1) @db.Decimal(19, 4)
  unitPrice      Decimal @db.Decimal(19, 4)
  amount         Decimal @db.Decimal(19, 4)
  sortOrder      Int     @default(0)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  creditMemo     CreditMemo   @relation(fields: [creditMemoId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([creditMemoId])
}

// ============================================================
// BUDGETS
// ============================================================

model Budget {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  fiscalYear     Int
  type           BudgetType @default(PROFIT_AND_LOSS)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lines          BudgetLine[]

  @@unique([organizationId, name, fiscalYear])
  @@index([organizationId])
}

model BudgetLine {
  id             String  @id @default(cuid())
  organizationId String
  budgetId       String
  accountId      String
  month          Int     // 1-12
  amount         Decimal @db.Decimal(19, 4)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  budget         Budget       @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@unique([budgetId, accountId, month])
  @@index([organizationId])
}

// ============================================================
// SUPPORTING ENTITIES
// ============================================================

model TaxRate {
  id             String  @id @default(cuid())
  organizationId String
  name           String
  rate           Decimal @db.Decimal(5, 4) // e.g. 0.0825 = 8.25%
  isActive       Boolean @default(true)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, name])
  @@index([organizationId])
}

model PaymentTerm {
  id             String   @id @default(cuid())
  organizationId String
  name           String   // "Net 30", "Due on Receipt"
  daysUntilDue   Int
  isActive       Boolean  @default(true)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customers      Customer[]
  vendors        Vendor[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Class {
  id             String  @id @default(cuid())
  organizationId String
  name           String
  parentId       String?
  isActive       Boolean @default(true)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  parent         Class?       @relation("ClassHierarchy", fields: [parentId], references: [id])
  children       Class[]      @relation("ClassHierarchy")

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Location {
  id             String  @id @default(cuid())
  organizationId String
  name           String
  address        String?
  isActive       Boolean @default(true)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Attachment {
  id             String   @id @default(cuid())
  organizationId String
  fileName       String
  fileUrl        String
  fileSize       Int
  mimeType       String
  entityType     String   // "invoice", "bill", "expense", etc.
  entityId       String
  uploadedBy     String
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([organizationId, entityType, entityId])
}

model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  action         String   // "CREATE", "UPDATE", "DELETE"
  entityType     String
  entityId       String
  changes        Json?    // { field: { old: x, new: y } }
  ipAddress      String?
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt])
}

// ============================================================
// API & WEBHOOKS
// ============================================================

model WebhookEndpoint {
  id             String   @id @default(cuid())
  organizationId String
  url            String
  secret         String
  events         String[] // ["invoice.created", "payment.received"]
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

model ApiKey {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  keyHash        String   @unique // store hashed, never plain
  prefix         String   // first 8 chars for identification: "lp_live_"
  scopes         String[] // ["read:invoices", "write:invoices"]
  lastUsedAt     DateTime?
  expiresAt      DateTime?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([prefix])
}

// ============================================================
// ENUMS
// ============================================================

enum SubscriptionTier {
  STARTER
  STANDARD
  PREMIUM
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  EXPIRED
}

enum OrgRole {
  OWNER
  ADMIN
  ACCOUNTANT
  ACCOUNTS_PAYABLE
  ACCOUNTS_RECEIVABLE
  BANKING
  SALES
  PURCHASING
  VIEWER
  MEMBER
}

enum AccountType {
  BANK
  ACCOUNTS_RECEIVABLE
  OTHER_CURRENT_ASSET
  FIXED_ASSET
  OTHER_ASSET
  ACCOUNTS_PAYABLE
  CREDIT_CARD
  OTHER_CURRENT_LIABILITY
  LONG_TERM_LIABILITY
  EQUITY
  INCOME
  COST_OF_GOODS_SOLD
  EXPENSE
  OTHER_INCOME
  OTHER_EXPENSE
}

enum JournalStatus {
  DRAFT
  POSTED
  VOIDED
}

enum TransactionSource {
  MANUAL
  INVOICE
  PAYMENT
  BILL
  BILL_PAYMENT
  EXPENSE
  DEPOSIT
  TRANSFER
  CREDIT_MEMO
  ADJUSTMENT
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL
  PAID
  OVERDUE
  VOIDED
}

enum BillStatus {
  UNPAID
  PARTIAL
  PAID
  OVERDUE
  VOIDED
}

enum EstimateStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  CONVERTED
  EXPIRED
}

enum POStatus {
  DRAFT
  SENT
  PARTIAL
  RECEIVED
  CLOSED
  VOIDED
}

enum CreditMemoStatus {
  DRAFT
  APPLIED
  PARTIAL
  VOIDED
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  DEBIT_CARD
  BANK_TRANSFER
  ACH
  WIRE
  OTHER
}

enum BankTransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER
  FEE
  INTEREST
  ADJUSTMENT
}

enum ItemType {
  SERVICE
  INVENTORY
  NON_INVENTORY
  BUNDLE
  GROUP
}

enum ReconciliationStatus {
  IN_PROGRESS
  COMPLETED
  VOIDED
}

enum BudgetType {
  PROFIT_AND_LOSS
  BALANCE_SHEET
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add complete Prisma schema with all accounting models and enums"
```

---

### Task 4: Prisma Client with Multi-Tenant RLS

**Files:**
- Create: `src/lib/db/prisma.ts`
- Create: `src/lib/db/tenant.ts`

**Step 1: Create the base Prisma client singleton**

```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 2: Create the tenant-scoped Prisma extension**

```typescript
// src/lib/db/tenant.ts
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

function forTenant(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await client.$transaction([
              client.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}

export function getTenantDb(tenantId: string) {
  return prisma.$extends(forTenant(tenantId));
}

export type TenantPrismaClient = ReturnType<typeof getTenantDb>;
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Prisma singleton and tenant-scoped client extension for RLS"
```

---

### Task 5: RLS Migration

**Files:**
- Modify: `prisma/migrations/` (custom SQL)

**Step 1: Generate initial migration without applying**

```bash
npx prisma migrate dev --create-only --name init
```

**Step 2: Append RLS policies to the migration SQL**

Add to the end of the generated `migration.sql`:

```sql
-- ============================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deposit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Estimate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstimateLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditMemo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditMemoLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTerm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEndpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies (one per table)
-- Pattern: current_setting('app.current_tenant', TRUE) must match organizationId
-- The TRUE parameter returns NULL instead of error when variable is unset

CREATE POLICY tenant_isolation ON "Account"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "JournalEntry"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "JournalLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Customer"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Invoice"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "InvoiceLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Payment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Vendor"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Bill"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "BillLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "BillPayment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Expense"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "ExpenseLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Item"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "BankAccount"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "BankTransaction"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Deposit"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Transfer"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Reconciliation"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Estimate"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "EstimateLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "PurchaseOrder"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "PurchaseOrderLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "CreditMemo"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "CreditMemoLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Budget"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "BudgetLine"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "TaxRate"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "PaymentTerm"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Class"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Location"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Attachment"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "Membership"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "WebhookEndpoint"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));

CREATE POLICY tenant_isolation ON "ApiKey"
  USING ("organizationId" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("organizationId" = current_setting('app.current_tenant', TRUE));
```

**Step 3: Apply migration**

```bash
npx prisma migrate dev
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add RLS policies for multi-tenant isolation on all tenant-scoped tables"
```

---

### Task 6: Authentication (Auth.js v5)

**Files:**
- Create: `src/lib/auth/auth.ts`
- Create: `src/lib/auth/auth.config.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/middleware.ts`

**Step 1: Create type augmentation for Auth.js**

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationSlug: string;
      role: string;
      subscriptionTier: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    organizationId: string;
    organizationSlug: string;
    role: string;
    subscriptionTier: string;
  }
}
```

**Step 2: Create auth config**

```typescript
// src/lib/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = !nextUrl.pathname.startsWith("/login") &&
                            !nextUrl.pathname.startsWith("/register") &&
                            !nextUrl.pathname.startsWith("/forgot-password") &&
                            !nextUrl.pathname.startsWith("/api/webhooks") &&
                            nextUrl.pathname !== "/";

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // redirect to login
      } else if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [], // configured in auth.ts
};
```

**Step 3: Create the main auth configuration**

```typescript
// src/lib/auth/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
      }

      // On sign-in or explicit session update, load organization context
      if (trigger === "signIn" || trigger === "update") {
        // Allow switching org via session update
        const targetOrgId = trigger === "update" && session?.organizationId
          ? session.organizationId
          : undefined;

        const membership = targetOrgId
          ? await prisma.membership.findUnique({
              where: {
                userId_organizationId: {
                  userId: token.userId,
                  organizationId: targetOrgId,
                },
              },
              include: { organization: true },
            })
          : await prisma.membership.findFirst({
              where: { userId: token.userId, isActive: true },
              orderBy: { invitedAt: "asc" },
              include: { organization: true },
            });

        if (membership) {
          token.organizationId = membership.organizationId;
          token.organizationSlug = membership.organization.slug;
          token.role = membership.role;
          token.subscriptionTier = membership.organization.subscriptionTier;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.organizationId = token.organizationId;
      session.user.organizationSlug = token.organizationSlug;
      session.user.role = token.role;
      session.user.subscriptionTier = token.subscriptionTier;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create a personal organization for new users
      if (!user.id || !user.email) return;
      const orgName = user.name ? `${user.name}'s Company` : "My Company";
      const slug = `org-${user.id.slice(0, 8)}`;

      const org = await prisma.organization.create({
        data: {
          name: orgName,
          slug,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
              joinedAt: new Date(),
            },
          },
        },
      });

      // Seed default Chart of Accounts for the new org
      // (called from a seeding function - see Task 9)
    },
  },
});
```

**Step 4: Create the API route handler**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth";
export const { GET, POST } = handlers;
```

**Step 5: Create middleware**

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth/auth";

export default auth;

export const config = {
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 6: Install bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js v5 with JWT strategy, org context, and auto-org creation"
```

---

### Task 7: Subscription Tier Limits & Feature Gating

**Files:**
- Create: `src/lib/subscriptions/tiers.ts`
- Create: `src/lib/subscriptions/gate.ts`

**Step 1: Define tier limits**

```typescript
// src/lib/subscriptions/tiers.ts
import { SubscriptionTier } from "@prisma/client";

export interface TierLimits {
  maxUsers: number;
  maxTransactionsPerMonth: number;
  maxReports: number;
  features: {
    basicInvoicing: boolean;
    estimatesAndCreditMemos: boolean;
    expenseTracking: "basic" | "full";
    billsAndBillPayments: boolean;
    customerVendorCenters: boolean;
    bankReconciliation: boolean;
    purchaseOrders: boolean;
    inventoryTracking: boolean;
    multiCurrency: boolean;
    classLocationTracking: boolean;
    budgetsAndForecasts: boolean;
    advancedInventory: boolean;
    advancedReporting: boolean;
    customUserRoles: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    aiFeatures: boolean;
  };
  support: "email" | "email_chat" | "priority" | "dedicated";
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  STARTER: {
    maxUsers: 1,
    maxTransactionsPerMonth: 500,
    maxReports: 5,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: false,
      expenseTracking: "basic",
      billsAndBillPayments: false,
      customerVendorCenters: false,
      bankReconciliation: false,
      purchaseOrders: false,
      inventoryTracking: false,
      multiCurrency: false,
      classLocationTracking: false,
      budgetsAndForecasts: false,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "email",
  },
  STANDARD: {
    maxUsers: 3,
    maxTransactionsPerMonth: 5000,
    maxReports: 20,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: false,
      inventoryTracking: false,
      multiCurrency: false,
      classLocationTracking: false,
      budgetsAndForecasts: false,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "email_chat",
  },
  PREMIUM: {
    maxUsers: 5,
    maxTransactionsPerMonth: 25000,
    maxReports: 50,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: true,
      inventoryTracking: true,
      multiCurrency: true,
      classLocationTracking: true,
      budgetsAndForecasts: true,
      advancedInventory: false,
      advancedReporting: false,
      customUserRoles: false,
      apiAccess: false,
      webhooks: false,
      aiFeatures: false,
    },
    support: "priority",
  },
  ENTERPRISE: {
    maxUsers: 25,
    maxTransactionsPerMonth: -1, // unlimited
    maxReports: -1,
    features: {
      basicInvoicing: true,
      estimatesAndCreditMemos: true,
      expenseTracking: "full",
      billsAndBillPayments: true,
      customerVendorCenters: true,
      bankReconciliation: true,
      purchaseOrders: true,
      inventoryTracking: true,
      multiCurrency: true,
      classLocationTracking: true,
      budgetsAndForecasts: true,
      advancedInventory: true,
      advancedReporting: true,
      customUserRoles: true,
      apiAccess: true,
      webhooks: true,
      aiFeatures: true,
    },
    support: "dedicated",
  },
};

export const PADDLE_PRICES = {
  STARTER: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER!,
  STANDARD: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD!,
  PREMIUM: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM!,
  ENTERPRISE: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE!,
} as const;

// Reverse mapping for webhook processing
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, id] of Object.entries(PADDLE_PRICES)) {
    if (id === priceId) return tier as SubscriptionTier;
  }
  return "STARTER";
}
```

**Step 2: Create the gating utility**

```typescript
// src/lib/subscriptions/gate.ts
import { SubscriptionTier } from "@prisma/client";
import { TIER_LIMITS, type TierLimits } from "./tiers";

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: string; requiredTier: SubscriptionTier };

export function checkFeature(
  tier: SubscriptionTier,
  feature: keyof TierLimits["features"]
): GateResult {
  const limits = TIER_LIMITS[tier];
  const value = limits.features[feature];

  if (value === false) {
    // Find the minimum tier that has this feature
    const tiers: SubscriptionTier[] = ["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"];
    const requiredTier = tiers.find((t) => TIER_LIMITS[t].features[feature] !== false) || "ENTERPRISE";
    return {
      allowed: false,
      reason: `This feature requires the ${requiredTier} plan or higher.`,
      requiredTier,
    };
  }

  return { allowed: true };
}

export function checkTransactionLimit(
  tier: SubscriptionTier,
  currentCount: number
): GateResult {
  const limits = TIER_LIMITS[tier];
  if (limits.maxTransactionsPerMonth === -1) return { allowed: true };

  if (currentCount >= limits.maxTransactionsPerMonth) {
    const tiers: SubscriptionTier[] = ["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"];
    const currentIdx = tiers.indexOf(tier);
    const requiredTier = tiers[currentIdx + 1] || "ENTERPRISE";
    return {
      allowed: false,
      reason: `You've reached the ${limits.maxTransactionsPerMonth} transaction limit for your ${tier} plan. Upgrade to continue.`,
      requiredTier,
    };
  }

  return { allowed: true };
}

export function checkUserLimit(
  tier: SubscriptionTier,
  currentUserCount: number
): GateResult {
  const limits = TIER_LIMITS[tier];
  if (currentUserCount >= limits.maxUsers) {
    const tiers: SubscriptionTier[] = ["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"];
    const currentIdx = tiers.indexOf(tier);
    const requiredTier = tiers[currentIdx + 1] || "ENTERPRISE";
    return {
      allowed: false,
      reason: `Your ${tier} plan supports up to ${limits.maxUsers} users. Upgrade to add more.`,
      requiredTier,
    };
  }

  return { allowed: true };
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add subscription tier definitions and feature gating utilities"
```

---

### Task 8: QuickBooks Desktop UI Shell

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/topbar.tsx`
- Create: `src/components/layout/home-workflow.tsx`

This task builds the QuickBooks Desktop-style layout: top menu bar, left sidebar with icon navigation, and the main content area. The Home page includes the workflow diagram.

**Step 1: Create the dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-[#ECE9D8]">
        <Topbar session={session} />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar session={session} />
          <main className="flex-1 overflow-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

**Step 2: Create the sidebar (QuickBooks left navigation / Icon Bar)**

```tsx
// src/components/layout/app-sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  Home, Users, Building2, FileText, Receipt, CreditCard,
  Landmark, BarChart3, Package, Calculator, Settings,
  ClipboardList, DollarSign, ArrowRightLeft, FileSpreadsheet,
  TrendingUp, ShoppingCart, BookOpen
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Navigation",
    items: [
      { name: "Home", href: "/dashboard", icon: Home },
    ],
  },
  {
    label: "Customers",
    items: [
      { name: "Customer Center", href: "/customers", icon: Users },
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Estimates", href: "/estimates", icon: ClipboardList },
      { name: "Receive Payments", href: "/payments", icon: DollarSign },
      { name: "Credit Memos", href: "/credit-memos", icon: Receipt, feature: "estimatesAndCreditMemos" },
    ],
  },
  {
    label: "Vendors",
    items: [
      { name: "Vendor Center", href: "/vendors", icon: Building2 },
      { name: "Bills", href: "/bills", icon: CreditCard, feature: "billsAndBillPayments" },
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, feature: "purchaseOrders" },
    ],
  },
  {
    label: "Banking",
    items: [
      { name: "Banking", href: "/banking", icon: Landmark, feature: "bankReconciliation" },
      { name: "Deposits", href: "/deposits", icon: ArrowRightLeft },
      { name: "Reconcile", href: "/reconciliation", icon: BookOpen, feature: "bankReconciliation" },
    ],
  },
  {
    label: "Company",
    items: [
      { name: "Chart of Accounts", href: "/accounts", icon: Calculator },
      { name: "Journal Entries", href: "/journal", icon: FileSpreadsheet },
      { name: "Items & Services", href: "/items", icon: Package },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Budgets", href: "/budgets", icon: TrendingUp, feature: "budgetsAndForecasts" },
    ],
  },
  {
    label: "",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ session }: { session: Session }) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-[#ACA899] bg-gradient-to-b from-[#3A6EA5] to-[#003366]">
      <SidebarContent className="py-2">
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            {group.label && (
              <SidebarGroupLabel className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "text-white/80 hover:bg-white/10 hover:text-white",
                        isActive && "bg-white/20 text-white font-semibold"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
```

**Step 3: Create the top bar (QuickBooks menu bar)**

```tsx
// src/components/layout/topbar.tsx
"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Building2, ChevronDown, LogOut, Settings, Users } from "lucide-react";

export function Topbar({ session }: { session: Session }) {
  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#ACA899] bg-gradient-to-r from-[#0054A6] via-[#0066CC] to-[#3A8FD6] px-3 shadow-sm">
      {/* Left: sidebar toggle + branding */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-white hover:bg-white/10" />
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-white" />
          <span className="text-sm font-bold text-white tracking-wide">
            LedgerPro
          </span>
        </div>
        <span className="text-xs text-blue-200 ml-2 hidden sm:inline">
          {session.user.organizationSlug}
        </span>
      </div>

      {/* Center: Quick action buttons (QuickBooks style) */}
      <div className="hidden md:flex items-center gap-1">
        {[
          { label: "New Invoice", href: "/invoices/new" },
          { label: "New Expense", href: "/expenses/new" },
          { label: "New Bill", href: "/bills/new" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="sm"
            className="text-xs text-white/90 hover:bg-white/10 hover:text-white h-7"
            asChild
          >
            <a href={action.href}>{action.label}</a>
          </Button>
        ))}
      </div>

      {/* Right: user menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10 h-8 px-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback className="bg-blue-800 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs hidden sm:inline">{session.user.name}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <Building2 className="mr-2 h-4 w-4" />
            Switch Company
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Users className="mr-2 h-4 w-4" />
            Manage Users
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function Calculator(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" />
      <path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  );
}
```

**Step 4: Create the Home page with QuickBooks workflow diagram**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { auth } from "@/lib/auth/auth";
import { HomeWorkflow } from "@/components/layout/home-workflow";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">
        Home
      </h1>
      <HomeWorkflow tier={session!.user.subscriptionTier} />
    </div>
  );
}
```

```tsx
// src/components/layout/home-workflow.tsx
"use client";

import Link from "next/link";
import {
  FileText, Receipt, DollarSign, CreditCard, Landmark,
  ClipboardList, ShoppingCart, ArrowRight, Users, Building2,
  BookOpen, ArrowRightLeft, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkflowItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}

function WorkflowItem({ icon: Icon, label, href, color }: WorkflowItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className={`p-2 rounded-lg ${color} group-hover:scale-105 transition-transform`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}

function WorkflowArrow() {
  return <ArrowRight className="h-4 w-4 text-gray-400 mt-2 flex-shrink-0" />;
}

export function HomeWorkflow({ tier }: { tier: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* VENDORS SECTION */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <WorkflowItem icon={ShoppingCart} label="Purchase Orders" href="/purchase-orders" color="bg-orange-500" />
            <WorkflowArrow />
            <WorkflowItem icon={CreditCard} label="Enter Bills" href="/bills/new" color="bg-orange-500" />
            <WorkflowArrow />
            <WorkflowItem icon={DollarSign} label="Pay Bills" href="/bills" color="bg-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* CUSTOMERS SECTION */}
      <Card className="border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-green-700 uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <WorkflowItem icon={ClipboardList} label="Estimates" href="/estimates" color="bg-green-500" />
            <WorkflowArrow />
            <WorkflowItem icon={FileText} label="Invoices" href="/invoices" color="bg-green-500" />
            <WorkflowArrow />
            <WorkflowItem icon={DollarSign} label="Receive Payments" href="/payments" color="bg-green-500" />
            <WorkflowArrow />
            <WorkflowItem icon={Landmark} label="Deposits" href="/deposits" color="bg-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* COMPANY SECTION */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <WorkflowItem icon={BookOpen} label="Chart of Accounts" href="/accounts" color="bg-blue-500" />
            <WorkflowItem icon={Receipt} label="Journal Entries" href="/journal" color="bg-blue-500" />
            <WorkflowItem icon={Package} label="Items & Services" href="/items" color="bg-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* BANKING SECTION */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Banking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <WorkflowItem icon={Landmark} label="Record Deposits" href="/deposits" color="bg-purple-500" />
            <WorkflowItem icon={CreditCard} label="Write Checks" href="/expenses/new" color="bg-purple-500" />
            <WorkflowItem icon={ArrowRightLeft} label="Transfer Funds" href="/banking/transfer" color="bg-purple-500" />
            <WorkflowItem icon={BookOpen} label="Reconcile" href="/reconciliation" color="bg-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add QuickBooks Desktop-style dashboard layout with sidebar, topbar, and workflow home"
```

---

## Phase 2: Core Accounting Engine

### Task 9: Default Chart of Accounts Seeder

**Files:**
- Create: `src/lib/accounting/seed-accounts.ts`

Seeds a standard Chart of Accounts when a new organization is created. Includes all 15 QuickBooks account types with standard default accounts.

**Step 1: Create the seeder**

```typescript
// src/lib/accounting/seed-accounts.ts
import { PrismaClient, AccountType } from "@prisma/client";

interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  detailType: string;
  isSystemAccount?: boolean;
}

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // BANK (1000s)
  { code: "1000", name: "Checking Account", type: "BANK", detailType: "Checking" },
  { code: "1010", name: "Savings Account", type: "BANK", detailType: "Savings" },
  { code: "1020", name: "Petty Cash", type: "BANK", detailType: "CashOnHand" },

  // ACCOUNTS RECEIVABLE (1100s)
  { code: "1100", name: "Accounts Receivable", type: "ACCOUNTS_RECEIVABLE", detailType: "AccountsReceivable", isSystemAccount: true },

  // OTHER CURRENT ASSET (1200s)
  { code: "1200", name: "Undeposited Funds", type: "OTHER_CURRENT_ASSET", detailType: "UndepositedFunds", isSystemAccount: true },
  { code: "1210", name: "Inventory Asset", type: "OTHER_CURRENT_ASSET", detailType: "Inventory" },
  { code: "1220", name: "Prepaid Expenses", type: "OTHER_CURRENT_ASSET", detailType: "PrepaidExpenses" },

  // FIXED ASSET (1500s)
  { code: "1500", name: "Furniture & Equipment", type: "FIXED_ASSET", detailType: "FurnitureAndFixtures" },
  { code: "1510", name: "Vehicles", type: "FIXED_ASSET", detailType: "Vehicles" },
  { code: "1520", name: "Buildings", type: "FIXED_ASSET", detailType: "Buildings" },
  { code: "1599", name: "Accumulated Depreciation", type: "FIXED_ASSET", detailType: "AccumulatedDepreciation" },

  // OTHER ASSET (1700s)
  { code: "1700", name: "Security Deposits", type: "OTHER_ASSET", detailType: "SecurityDeposits" },

  // ACCOUNTS PAYABLE (2000s)
  { code: "2000", name: "Accounts Payable", type: "ACCOUNTS_PAYABLE", detailType: "AccountsPayable", isSystemAccount: true },

  // CREDIT CARD (2100s)
  { code: "2100", name: "Company Credit Card", type: "CREDIT_CARD", detailType: "CreditCard" },

  // OTHER CURRENT LIABILITY (2200s)
  { code: "2200", name: "Payroll Liabilities", type: "OTHER_CURRENT_LIABILITY", detailType: "PayrollTaxPayable" },
  { code: "2210", name: "Sales Tax Payable", type: "OTHER_CURRENT_LIABILITY", detailType: "SalesTaxPayable" },
  { code: "2220", name: "Accrued Expenses", type: "OTHER_CURRENT_LIABILITY", detailType: "AccruedLiabilities" },
  { code: "2230", name: "Current Portion of Long-Term Debt", type: "OTHER_CURRENT_LIABILITY", detailType: "CurrentPortionOfObligations" },

  // LONG TERM LIABILITY (2500s)
  { code: "2500", name: "Long-Term Notes Payable", type: "LONG_TERM_LIABILITY", detailType: "NotesPayable" },
  { code: "2510", name: "Mortgage Payable", type: "LONG_TERM_LIABILITY", detailType: "NotesPayable" },

  // EQUITY (3000s)
  { code: "3000", name: "Owner's Equity", type: "EQUITY", detailType: "OwnersEquity" },
  { code: "3100", name: "Owner's Investment", type: "EQUITY", detailType: "PaidInCapital" },
  { code: "3200", name: "Owner's Draw", type: "EQUITY", detailType: "OwnersEquity" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY", detailType: "RetainedEarnings", isSystemAccount: true },
  { code: "3910", name: "Opening Balance Equity", type: "EQUITY", detailType: "OpeningBalanceEquity", isSystemAccount: true },

  // INCOME (4000s)
  { code: "4000", name: "Sales Revenue", type: "INCOME", detailType: "SalesOfProductIncome" },
  { code: "4010", name: "Service Revenue", type: "INCOME", detailType: "ServiceFeeIncome" },
  { code: "4020", name: "Discounts Given", type: "INCOME", detailType: "DiscountsRefundsGiven" },
  { code: "4030", name: "Shipping & Delivery Income", type: "INCOME", detailType: "OtherPrimaryIncome" },

  // COST OF GOODS SOLD (5000s)
  { code: "5000", name: "Cost of Goods Sold", type: "COST_OF_GOODS_SOLD", detailType: "SuppliesMaterialsCogs" },
  { code: "5010", name: "Purchases", type: "COST_OF_GOODS_SOLD", detailType: "SuppliesMaterialsCogs" },
  { code: "5020", name: "Freight & Delivery - COGS", type: "COST_OF_GOODS_SOLD", detailType: "FreightAndDeliveryCost" },
  { code: "5030", name: "Subcontractors - COGS", type: "COST_OF_GOODS_SOLD", detailType: "OtherCostsOfServiceCOS" },

  // EXPENSE (6000s)
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

  // OTHER INCOME (7000s)
  { code: "7000", name: "Interest Income", type: "OTHER_INCOME", detailType: "InterestEarned" },
  { code: "7010", name: "Gain on Sale of Assets", type: "OTHER_INCOME", detailType: "GainLossOnSaleOfFixedAssets" },
  { code: "7020", name: "Other Income", type: "OTHER_INCOME", detailType: "OtherInvestmentIncome" },

  // OTHER EXPENSE (8000s)
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
    isSystemAccount: acct.isSystemAccount || false,
  }));

  await prisma.account.createMany({ data: accounts });
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
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add default Chart of Accounts and Payment Terms seeder"
```

---

### Task 10: Accounting Engine — Journal Entry Service

**Files:**
- Create: `src/lib/accounting/journal-entry.service.ts`
- Create: `src/lib/accounting/types.ts`

The double-entry bookkeeping engine. Every financial transaction ultimately creates a journal entry with balanced debits and credits.

**Step 1: Create accounting types**

```typescript
// src/lib/accounting/types.ts
import { Decimal } from "decimal.js";
import { AccountType } from "@prisma/client";

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
  sourceType?: string;
  sourceId?: string;
}

// Which side increases the balance for each account type
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
```

**Step 2: Create the journal entry service**

```typescript
// src/lib/accounting/journal-entry.service.ts
import { TenantPrismaClient } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/prisma";
import { Decimal } from "decimal.js";
import { CreateJournalEntryInput, ACCOUNT_NORMAL_BALANCES } from "./types";
import { TransactionSource, AccountType } from "@prisma/client";

export class JournalEntryService {
  constructor(
    private db: TenantPrismaClient,
    private organizationId: string
  ) {}

  async create(input: CreateJournalEntryInput) {
    // Validate: debits must equal credits
    const totalDebits = input.lines.reduce((sum, l) => sum.plus(l.debit), new Decimal(0));
    const totalCredits = input.lines.reduce((sum, l) => sum.plus(l.credit), new Decimal(0));

    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
      );
    }

    if (totalDebits.isZero()) {
      throw new Error("Journal entry must have at least one non-zero line.");
    }

    // Validate: each line must have debit OR credit, not both
    for (const line of input.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new Error("A journal line cannot have both a debit and credit amount.");
      }
      if (line.debit < 0 || line.credit < 0) {
        throw new Error("Journal line amounts cannot be negative.");
      }
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber();

    // Create journal entry with lines in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Set tenant context
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const entry = await tx.journalEntry.create({
        data: {
          organizationId: this.organizationId,
          entryNumber,
          date: input.date,
          memo: input.memo,
          reference: input.reference,
          isAdjusting: input.isAdjusting || false,
          sourceType: input.sourceType as TransactionSource || "MANUAL",
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
        include: { lines: { include: { account: true } } },
      });

      // Update account balances
      for (const line of input.lines) {
        const account = await tx.account.findUniqueOrThrow({
          where: { id: line.accountId },
        });

        const normalBalance = ACCOUNT_NORMAL_BALANCES[account.type];
        let balanceChange: Decimal;

        if (normalBalance === "DEBIT") {
          // Debits increase, credits decrease
          balanceChange = new Decimal(line.debit).minus(line.credit);
        } else {
          // Credits increase, debits decrease
          balanceChange = new Decimal(line.credit).minus(line.debit);
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: {
            balance: { increment: balanceChange.toNumber() },
          },
        });
      }

      // Increment org transaction count
      await tx.organization.update({
        where: { id: this.organizationId },
        data: { transactionCount: { increment: 1 } },
      });

      return entry;
    });

    return journalEntry;
  }

  async void(journalEntryId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${this.organizationId}, TRUE)`;

      const entry = await tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntryId },
        include: { lines: { include: { account: true } } },
      });

      if (entry.status === "VOIDED") {
        throw new Error("Journal entry is already voided.");
      }

      // Reverse account balance impacts
      for (const line of entry.lines) {
        const normalBalance = ACCOUNT_NORMAL_BALANCES[line.account.type];
        let balanceChange: Decimal;

        if (normalBalance === "DEBIT") {
          balanceChange = new Decimal(line.credit.toString()).minus(line.debit.toString());
        } else {
          balanceChange = new Decimal(line.debit.toString()).minus(line.credit.toString());
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { increment: balanceChange.toNumber() } },
        });
      }

      return tx.journalEntry.update({
        where: { id: journalEntryId },
        data: { status: "VOIDED" },
      });
    });
  }

  private async generateEntryNumber(): Promise<string> {
    const lastEntry = await this.db.journalEntry.findFirst({
      orderBy: { createdAt: "desc" },
      select: { entryNumber: true },
    });

    if (!lastEntry) return "JE-0001";

    const lastNumber = parseInt(lastEntry.entryNumber.split("-")[1]);
    return `JE-${String(lastNumber + 1).padStart(4, "0")}`;
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add double-entry journal entry service with balance validation and account updates"
```

---

### Task 11: Chart of Accounts CRUD API

**Files:**
- Create: `src/app/api/v1/accounts/route.ts`
- Create: `src/app/api/v1/accounts/[id]/route.ts`
- Create: `src/lib/api/auth.ts` (API auth helper)

**Step 1: Create the API auth helper**

```typescript
// src/lib/api/auth.ts
import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db/tenant";

export async function withAuth() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = getTenantDb(session.user.organizationId);

  return {
    session,
    db,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    role: session.user.role,
  };
}
```

**Step 2: Create accounts list + create API**

```typescript
// src/app/api/v1/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const createAccountSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1).max(100),
  type: z.enum([
    "BANK", "ACCOUNTS_RECEIVABLE", "OTHER_CURRENT_ASSET", "FIXED_ASSET",
    "OTHER_ASSET", "ACCOUNTS_PAYABLE", "CREDIT_CARD", "OTHER_CURRENT_LIABILITY",
    "LONG_TERM_LIABILITY", "EQUITY", "INCOME", "COST_OF_GOODS_SOLD",
    "EXPENSE", "OTHER_INCOME", "OTHER_EXPENSE",
  ]),
  detailType: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const active = searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (active !== null) where.isActive = active === "true";

  const accounts = await db.account.findMany({
    where,
    include: { parent: { select: { id: true, name: true } } },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await db.account.create({
    data: {
      organizationId,
      ...parsed.data,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
```

**Step 3: Create single account GET/PUT/DELETE API**

```typescript
// src/app/api/v1/accounts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  code: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const account = await db.account.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, code: true, type: true, balance: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const body = await request.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await db.account.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(account);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const account = await db.account.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.isSystemAccount) {
    return NextResponse.json({ error: "System accounts cannot be deleted" }, { status: 400 });
  }

  // Soft-delete: deactivate instead of removing
  await db.account.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Chart of Accounts CRUD API with validation and soft-delete"
```

---

### Task 12: Journal Entries API

**Files:**
- Create: `src/app/api/v1/journal-entries/route.ts`
- Create: `src/app/api/v1/journal-entries/[id]/route.ts`
- Create: `src/app/api/v1/journal-entries/[id]/void/route.ts`

**Step 1: Create journal entries list + create API**

```typescript
// src/app/api/v1/journal-entries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";
import { checkTransactionLimit } from "@/lib/subscriptions/gate";
import { SubscriptionTier } from "@prisma/client";
import { z } from "zod";

const createJournalEntrySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  memo: z.string().optional(),
  reference: z.string().optional(),
  isAdjusting: z.boolean().optional(),
  lines: z.array(z.object({
    accountId: z.string(),
    description: z.string().optional(),
    debit: z.number().min(0),
    credit: z.number().min(0),
    classId: z.string().optional(),
    locationId: z.string().optional(),
    customerId: z.string().optional(),
    vendorId: z.string().optional(),
  })).min(2),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
  }

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      include: { lines: { include: { account: { select: { id: true, name: true, code: true } } } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.journalEntry.count({ where }),
  ]);

  return NextResponse.json({
    data: entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  // Check transaction limit
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { transactionCount: true },
  });

  const limitCheck = checkTransactionLimit(tier as SubscriptionTier, org.transactionCount);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createJournalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new JournalEntryService(db, organizationId);
    const entry = await service.create(parsed.data);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create journal entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

**Step 2: Create void endpoint**

```typescript
// src/app/api/v1/journal-entries/[id]/void/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;
  const { id } = await params;

  try {
    const service = new JournalEntryService(db, organizationId);
    const entry = await service.void(id);
    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to void journal entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add journal entries API with pagination, filtering, and void capability"
```

---

### Tasks 13–14: Chart of Accounts and Journal Entries UI Pages

These tasks create the frontend pages for Chart of Accounts listing, account creation/editing, Journal Entry listing, and the Journal Entry form with debit/credit line items. They follow the QuickBooks Desktop visual style: data tables with toolbar actions, modal forms, and the classic blue/gray color scheme.

*(Detailed component code follows the same patterns established in Tasks 8–12. Each page includes: data fetching via React Query, shadcn/ui DataTable, create/edit dialogs with form validation via zod + react-hook-form, and responsive layout.)*

**Step 1: Chart of Accounts page — list view with data table**
**Step 2: Account create/edit dialog**
**Step 3: Journal Entries page — list view with expandable rows showing lines**
**Step 4: Journal Entry create form — dynamic line items with running debit/credit totals**
**Step 5: Commit each page**

---

## Phase 3: Money In (Customers & Invoicing) — Tasks 15–20

| Task | Description |
|---|---|
| 15 | Customer CRUD API + Customer Center UI (list, detail panel, transaction history) |
| 16 | Invoice service (auto-generates JE on post, calculates tax, handles partial payments) |
| 17 | Invoice CRUD API with PDF generation |
| 18 | Invoice UI — form with line items, preview, send, QuickBooks-style template |
| 19 | Receive Payment API + UI (apply to invoice, handle overpayments, undeposited funds) |
| 20 | Sales Receipt + Credit Memo API + UI |

---

## Phase 4: Money Out (Vendors & Bills) — Tasks 21–25

| Task | Description |
|---|---|
| 21 | Vendor CRUD API + Vendor Center UI |
| 22 | Bill service (auto-generates JE on post, tracks AP aging) |
| 23 | Bill CRUD API + Bill form UI with line items |
| 24 | Pay Bills API + UI (batch pay, payment method selection) |
| 25 | Expense tracking API + UI (quick expense entry, receipt upload) |

---

## Phase 5: Banking — Tasks 26–29

| Task | Description |
|---|---|
| 26 | Bank Account management API + UI |
| 27 | Deposit API + UI (select undeposited funds to deposit) |
| 28 | Transfer Funds API + UI |
| 29 | Bank Reconciliation API + UI (match transactions, mark cleared, running balance) |

---

## Phase 6: Financial Reports — Tasks 30–34

| Task | Description |
|---|---|
| 30 | Report engine service (date range, comparison, cash vs accrual basis) |
| 31 | Profit & Loss / Income Statement |
| 32 | Balance Sheet |
| 33 | Cash Flow Statement |
| 34 | Trial Balance, General Ledger, A/R Aging, A/P Aging |

---

## Phase 7: Paddle Subscriptions & Feature Gating — Tasks 35–39

| Task | Description |
|---|---|
| 35 | PaddleProvider component + checkout integration |
| 36 | Pricing page with tier comparison |
| 37 | Paddle webhook handler (subscription.created, .updated, .canceled, transaction.completed) |
| 38 | Subscription management UI (current plan, upgrade/downgrade, cancel, billing history) |
| 39 | Feature gate middleware + upgrade prompts throughout the UI |

---

## Phase 8: API, Webhooks & Integrations — Tasks 40–43

| Task | Description |
|---|---|
| 40 | API key management (generate, revoke, scope-based access) |
| 41 | External webhook system (register endpoints, event types, delivery + retry) |
| 42 | Versioned REST API documentation (OpenAPI spec) |
| 43 | Bank integration foundation (Plaid/open banking API connection, transaction sync) |

---

## Phase 9: AI Integration — Tasks 44–45

| Task | Description |
|---|---|
| 44 | Claude API service for transaction categorization (suggest account for expenses, auto-match bank transactions) |
| 45 | AI-powered report insights (natural language questions about financial data, anomaly detection) |

---

## Appendix: Database Entity Relationship Summary

```
Organization (tenant root)
├── Membership ──→ User (global)
├── Account (Chart of Accounts, hierarchical)
├── JournalEntry ──→ JournalLine ──→ Account
├── Customer ──→ Invoice ──→ InvoiceLine
│            ──→ Payment
│            ──→ Estimate ──→ EstimateLine
│            ──→ CreditMemo ──→ CreditMemoLine
├── Vendor ──→ Bill ──→ BillLine
│          ──→ BillPayment
│          ──→ Expense ──→ ExpenseLine
│          ──→ PurchaseOrder ──→ PurchaseOrderLine
├── Item (Products & Services)
├── BankAccount ──→ BankTransaction
│               ──→ Reconciliation
├── Deposit, Transfer
├── Budget ──→ BudgetLine
├── TaxRate, PaymentTerm, Class, Location
├── Attachment, AuditLog
├── WebhookEndpoint, ApiKey
```

Every table with `organizationId` has PostgreSQL RLS enforced via `app.current_tenant` session variable.
