# Apka Munim — PRD & Change Log

## Problem
Apka Munim is a Hinglish personal-finance + billing app (React + FastAPI + MongoDB). It serves two personas: personal-finance users tracking income / kharcha / udhaar, and small-business owners running GST-compliant billing (invoices, quotations, parties, inventory, payments).

## Personas
- Personal-finance user tracking income, kharcha, udhaar in Hinglish
- Small-business owner using the Billing side (invoices, quotations, parties, inventory)

## Static core requirements
- Auth (email/password + Google), JWT via cookies + Bearer
- Multi-ledger scoping (personal + shared)
- Transactions, accounts, budgets, goals, warranties, kids, splits, investments
- Billing: invoices, quotations, proforma, challans, credit/debit notes, sales returns
- Standalone ERP-style Billing workspace with its own sidebar + top header
- Voice / SMS / LLM insights (Anthropic → Groq → Emergent)
- Public account-deletion request (unauthenticated form)
- Slowapi rate-limiting on auth + sensitive endpoints

## What was implemented in the cleanup/stabilization pass (Feb 2026)

### Backend (`backend/server.py`)
- Removed broken duplicate `DELETE /api/user/delete-account`, rewrote `POST /api/public/delete-account-request` with EmailStr + rate limit.
- Graceful env checks (`JWT_SECRET`, `GOOGLE_CLIENT_ID`) with clear RuntimeError.
- Added `WarrantyUpdateIn`, `PATCH /warranties/{id}`, `PATCH /kids/{kid_id}`, `PATCH /accounts/{account_id}`.
- Rate-limited + premium-gated `POST /voice/parse-transaction` (5/day free LLM fallback).

### Frontend
- Landing / Dashboard split via `RootRoute`.
- FY-aware invoice numbering, PDF polish (logo, GSTIN, T&C), UPI QR on PDF, E-invoice IRN fields, WhatsApp share.
- Payment reconciliation UI + Bank CSV import.
- Recurring auto-run via APScheduler + Overdue Email Digest.
- Multi-language support (Hindi / Hinglish / English) via LanguageContext.

## ERP Billing Workspace refactor (Feb 2026 — Phase 1)

Standalone ERP-style workspace, no longer nested inside the personal Layout:
- **New**: `components/billing/BillingSidebar.jsx` — vertical, collapsible, section-grouped nav with active-child auto-expand and mobile drawer. Includes a "Back to Personal" button that returns to `/dashboard`.
- **Rewritten**: `components/billing/BillingLayout.jsx` — standalone shell: `<BillingSidebar>` + `<BillingHeader>` + main content. Owns its own `financialYear` state.
- **Rewritten**: `components/billing/BillingHeader.jsx` — sticky top bar with Create dropdown (Sales / Purchase / Money), FY switcher, mobile menu toggle, Personal shortcut, settings.
- **Removed** (dead code): `components/billing/BillingSubNav.jsx` and duplicate `components/billing/BillingDashboardWorkspace.jsx`.
- **App.js**: `ProtectedBillingRoute` no longer wraps children in the personal `Layout`.

### New dedicated Billing pages
- `/billing/sales-returns` → `pages/billing/SalesReturns.jsx` (Credit Note flow with return-specific header + guidance).
- `/billing/customer-ledger` → `pages/billing/CustomerLedger.jsx` (per-customer total sales + outstanding, search) — data source `/api/billing/customers` + `/api/billing/invoices`.
- `/billing/supplier-ledger` → `pages/billing/SupplierLedger.jsx` (per-supplier total purchase + payable, search) — data source `/api/billing/suppliers` + `/api/billing/invoices`.
- `/billing/inventory-adjustments` → `pages/billing/InventoryAdjustments.jsx` (stock levels, low / out-of-stock counters, valuation).

### Testing (iteration 11)
- Backend regression 7/7 green (billing/invoices, billing/products, billing/customers, billing/suppliers, ledgers, udhaar, analytics/summary).
- Frontend: standalone ERP shell verified on /billing (no main Layout leak on any /billing/*), all 8 sidebar sections + auto-expand + drilldown, header Create dropdown, FY switcher, Personal shortcut, all 4 new pages rendering with correct data-testids.
- Post-fix smoke: CustomerLedger seeded with a real customer via `POST /api/billing/customers` now displays the row correctly (screenshot verified).

## Smoke tests run
- `yarn build` compiles clean, gzip main bundle 383 kB.
- All 28 backend tests still pass (from prior pass).

## Backlog / Next
- P1: Document conversion flows — Quotation / SO / Delivery Challan → Invoice.
- P1: Customer / Supplier profile pages with full ledger drilldown + statement PDF.
- P1: Purchase Bills as a first-class module (not just an Invoices filter).
- P2: Google Play Data Safety declaration audit.
- P2: Automated MongoDB backups (Atlas snapshot cron).
- P2: Rotate all leaked keys (Mongo, Resend, Groq, JWT, Google) — user action.
