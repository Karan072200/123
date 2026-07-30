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

## What was implemented in the cleanup / stabilization pass (Feb 2026)
- Removed broken duplicate `DELETE /api/user/delete-account`, rewrote `POST /api/public/delete-account-request` with EmailStr + rate limit.
- Graceful env checks (`JWT_SECRET`, `GOOGLE_CLIENT_ID`).
- Added `WarrantyUpdateIn`, `PATCH /warranties/{id}`, `PATCH /kids/{kid_id}`, `PATCH /accounts/{account_id}`.
- FY-aware invoice numbering, PDF polish, UPI QR, E-invoice IRN fields, WhatsApp share.
- Payment reconciliation UI + Bank CSV import.
- Recurring auto-run via APScheduler + Overdue Email Digest.
- Multi-language support (Hindi / Hinglish / English) via LanguageContext.

## ERP Billing Workspace refactor — Phase 1 (Feb 2026)
- New `BillingSidebar.jsx` (vertical, 8 sections, collapsible, mobile drawer, "Back to Personal").
- Rewritten `BillingLayout.jsx` — standalone shell, no longer nested inside personal Layout.
- Rewritten `BillingHeader.jsx` — Create dropdown (Sales / Purchase / Money), FY switcher.
- Removed dead code: `BillingSubNav.jsx`, duplicate `BillingDashboardWorkspace.jsx`.
- Fixed CustomerLedger/SupplierLedger to use `/billing/customers` + `/billing/suppliers`.
- 4 new pages: Sales Returns, Customer Ledger, Supplier Ledger, Inventory Adjustments.
- Iteration 11 report: 100% pass (backend regression + frontend flows).

## ERP Billing Workspace — Phase 2 (Feb 2026, current)

### Backend (`server.py`)
- `POST /api/billing/invoices/{id}/convert` — one-tap conversion Quotation/SO/Challan/Proforma → Tax Invoice with `converted_from_*` / `converted_to_*` audit fields.
- `GET /api/billing/parties/{id}` — single-party fetch.
- `GET /api/billing/parties/{id}/statement` — party ledger JSON.
- `GET /api/billing/parties/{id}/statement.pdf` — WhatsApp-shareable ledger PDF (ReportLab).
- `GET /api/gstin/lookup/{gstin}` — 15-char structural parse → state, PAN, entity type. Rate-limited 30/min.

### Frontend
- Convert button + Converted badge on Invoices.jsx rows (quotation/SO/challan/proforma).
- New `PartyProfile.jsx` at `/billing/parties/:id` — KPIs, invoices list, WhatsApp share, Statement PDF download.
- New `PurchaseBills.jsx` at `/billing/purchase-bills` — first-class module with search + KPIs. BillingSidebar Purchase group now points here.
- New `GstinInput.jsx` reusable component — wired into Parties.jsx add-customer dialog with auto-fill on blur.
- CustomerLedger / SupplierLedger rows navigate to `/billing/parties/:id`.
- Static Tailwind class map for PartyProfile accent color (JIT-safe).

### Iteration 12 test results (both) — 100% pass
- Backend 13/13 pytest cases (GSTIN valid/invalid/unauth, Convert quotation→tax + source flag flip, Party profile+statement totals, statement.pdf `%PDF-` header, Purchase invoice CRUD, full regression).
- Frontend 7/7 flows (purchase-bills page, party-profile page, convert flow, converted-badge, GSTIN autofill, personal-layout intact on /dashboard, statement PDF direct fetch).

## Backlog / Next
- P1: Purchase Bills — server-side `?type=purchase` filter (currently client-side; caps at 500 invoices).
- P1: Convert dialog — replace `window.confirm` with shadcn `<AlertDialog>` for a11y.
- P1: GSTIN legal-name enrichment via a paid GST API (ClearTax / GSTN) — the endpoint contract is ready to accept it.
- P2: InvoiceCreate `type=purchase` UI flow end-to-end verification.
- P2: Google Play Data Safety declaration audit.
- P2: Automated MongoDB Atlas backups.
- P2: Rotate all leaked keys (Mongo, Resend, Groq, JWT, Google) — pending user action.
