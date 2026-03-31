@AGENTS.md

# LedgerPro — QuickBooks Desktop Clone (SaaS)

## Project Overview

Multi-tenant SaaS accounting platform modeled after QuickBooks Desktop. Built with Next.js 15 (App Router), PostgreSQL on Railway, Prisma ORM, and Paddle Billing.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes (`/api/v1/`), Prisma ORM 6
- **Database**: PostgreSQL 16 on Railway with Row-Level Security
- **Auth**: Auth.js v5 (NextAuth) — JWT strategy with `organizationId` in token
- **Payments**: Paddle Billing v2 (subscriptions, feature gating)
- **AI**: Claude API (`@anthropic-ai/sdk`)
- **State**: Zustand (client), React Query (server)
- **Testing**: Vitest + Testing Library + Playwright (E2E)

## Architecture

### Multi-Tenancy
- Every tenant-scoped table has `organizationId` column
- PostgreSQL RLS policies enforce isolation via `app.current_tenant` session variable
- Prisma Client Extensions set tenant context per request in a transaction
- Auth.js JWT embeds `organizationId`, `role`, and `subscriptionTier`

### API Design
- All APIs versioned under `/api/v1/`
- `withAuth()` helper returns tenant-scoped Prisma client
- Zod validation on all inputs
- Pagination: `{ data: [], pagination: { page, limit, total, totalPages } }`
- API must be consumable by web, future mobile app, and third-party integrations

### Accounting Engine
- Double-entry bookkeeping: every transaction creates a balanced JournalEntry
- 15 QuickBooks account types with normal balance rules (DEBIT/CREDIT)
- Account balances updated atomically within journal entry transactions
- Document numbers auto-generated: INV-0001, BILL-0001, JE-0001, etc.

### Subscription Tiers
- **Starter** ($19/mo): 1 user, basic invoicing, 5 reports, 500 txns/mo
- **Standard** ($39/mo): 3 users, bills, bank recon, 20 reports, 5K txns/mo
- **Premium** ($69/mo): 5 users, POs, inventory, multi-currency, 50+ reports, 25K txns/mo
- **Enterprise** ($149/mo): 25 users, advanced everything, API, AI, unlimited

### Feature Gating
- `checkFeature(tier, feature)` returns `{ allowed, reason, requiredTier }`
- Server-side enforcement in API routes; client-side for UI visibility
- Transaction count limits checked before creating journal entries

## Key Conventions

- **File naming**: kebab-case for files, PascalCase for components
- **Imports**: Use `@/` alias (maps to `src/`)
- **Decimal handling**: `Decimal(19,4)` in Prisma, `decimal.js` in service layer
- **Error responses**: `{ error: string }` with appropriate HTTP status
- **Soft deletes**: Deactivate (`isActive: false`) instead of deleting, especially for accounts
- **System accounts**: Cannot be deleted or renamed (Accounts Receivable, Accounts Payable, Retained Earnings, etc.)

## Implementation Plan

See `docs/plans/2026-03-31-quickbooks-clone-saas.md` for the full plan with 45 tasks across 9 phases.

## Commands

```bash
npm run dev          # Start dev server
npx prisma studio    # Database GUI
npx prisma migrate dev --create-only --name <name>  # Create migration
npx prisma migrate dev   # Apply migrations
npx prisma generate      # Regenerate client
npm run test             # Run tests
npm run build            # Production build
```
