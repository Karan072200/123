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

## Stabilization pass (Feb 2026)
Backend cleanup, duplicate endpoints removal, rate limiting, FY-aware invoice numbering, UPI QR on PDF, E-invoice IRN fields, WhatsApp share, Bank CSV import, APScheduler for recurring invoices + overdue email digest, multi-language support.

## ERP Billing Workspace — Phase 1
- New `BillingSidebar.jsx` (vertical, 8 sections, mobile drawer, "Back to Personal").
- Rewritten `BillingLayout.jsx` — standalone shell, no longer nested inside personal Layout.
- Rewritten `BillingHeader.jsx` — Create dropdown, FY switcher.
- 4 new pages: Sales Returns, Customer Ledger, Supplier Ledger, Inventory Adjustments.
- **Iteration 11**: 100% pass.

## ERP Billing Workspace — Phase 2 (5 features)
- **Convert Documents**: `POST /api/billing/invoices/{id}/convert` (Quotation/SO/Challan/Proforma → Tax Invoice) with `converted_from_*` / `converted_to_*` audit + Invoices.jsx row button + Converted badge.
- **Party Profile**: `/billing/parties/:id` with KPIs, invoices list, WhatsApp share, Statement PDF download.
- **Purchase Bills**: dedicated first-class page `/billing/purchase-bills`.
- **Statement PDF**: `/api/billing/parties/{id}/statement.pdf` via ReportLab.
- **GSTIN Autofill**: `/api/gstin/lookup/{gstin}` structural parse (state, PAN, entity type), reusable `GstinInput` wired into Parties add/edit dialog.
- **Iteration 12**: 100% pass (13/13 backend + 7/7 frontend).

## ERP Billing Workspace — Phase 3 (gap fixes)
User asked "kuch kami hai kya" — comprehensive sweep:
1. **Parties.jsx cards clickable** → navigate to `/billing/parties/:id` (edit/delete propagation stopped).
2. **Sidebar routes no longer exit workspace** — removed `/customers`, `/suppliers`, `/reports-ai`; consolidated Parties section to a single `/billing/parties` link.
3. **InvoiceCreate INVOICE_TYPES** now includes `Purchase Bill` + `Sales Order` (9 types total).
4. **CustomerLedger / SupplierLedger row Statement PDF button** with shared `downloadPartyStatement` helper in `/lib/partyStatement.js`.
5. **Parties.jsx openEdit** coalesces null Mongo values → no more "value prop should not be null" React warnings.
- **Iteration 13**: 100% pass (7/7 backend + 7/7 frontend).

## Backlog / Next
- P1: **GST Name Lookup** — wire a paid GST API (Appyflow / ClearTax / IRIS / Masters India) so `/api/gstin/lookup` also returns `legal_name` + `address`. **Awaiting user choice of provider + API key.**
- P1: Convert dialog — replace `window.confirm` with shadcn `<AlertDialog>` for a11y.
- P1: Purchase Bills — server-side `?type=purchase` filter (currently client-side; caps at 500 invoices).
- P2: Reminder auto-send (WhatsApp statement + payment link every 7 days for overdue customers).
- P2: Google Play Data Safety declaration audit.
- P2: Automated MongoDB Atlas backups.
- P2: Rotate all leaked keys (Mongo, Resend, Groq, JWT, Google) — pending user action.
