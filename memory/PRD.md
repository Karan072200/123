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
- Weekly APScheduler: overdue email digest Mon 08:00 IST + WhatsApp reminders Mon 09:00 IST

## Stabilization pass (Feb 2026)
Backend cleanup, duplicate endpoints removal, rate limiting, FY-aware invoice numbering, UPI QR on PDF, E-invoice IRN fields, WhatsApp share, Bank CSV import, recurring invoices, multi-language support.

## ERP Billing Workspace — Phase 1
Standalone sidebar + header, 4 new pages (Sales Returns, Customer Ledger, Supplier Ledger, Inventory Adjustments). **Iteration 11: 100% pass.**

## ERP Billing Workspace — Phase 2
Convert Documents endpoint + UI, PartyProfile, Purchase Bills first-class page, Statement PDF, GSTIN structural autofill. **Iteration 12: 100% pass.**

## ERP Billing Workspace — Phase 3 (gap sweep)
Clickable Parties cards, sidebar routes no longer exit workspace, `Purchase Bill` + `Sales Order` types in InvoiceCreate dropdown, Statement PDF button on ledger rows, `partyStatement.js` shared util. **Iteration 13: 100% pass.**

## ERP Billing Workspace — Phase 4 (current, iteration 14: 100% pass)
1. **Convert AlertDialog**: `window.confirm` swapped for a shadcn `<AlertDialog>` (`convert-dialog` + `convert-dialog-cancel` + `convert-dialog-confirm` testids). Nice modal with title, Hinglish description, disabled state during POST, then navigates to the newly-created tax invoice for editing.
2. **Auto WhatsApp Reminders**:
   - `PATCH /api/billing/settings/reminders` + `GET /api/billing/settings/reminders` — per-user toggle + interval (1-90 days, default 7).
   - `POST /api/billing/parties/{id}/send-reminder` — 30/min rate-limited; returns pre-built `wa.me/{phone}?text=...` URL + records `last_reminder_at`; 400 if no outstanding, 404 if unknown party.
   - Weekly scheduler `_weekly_whatsapp_reminder_job` (Mon 09:00 IST). For each user with `reminders_enabled`, finds customers with outstanding > 0 whose last reminder is older than the configured interval, emails owner a click-to-WhatsApp digest and stamps `last_reminder_at` on each party so the next run waits `interval` days.
   - PartyProfile "Send Reminder" button (BellRing, data-testid `party-profile-reminder-btn`) — visible ONLY when `isCustomer && totals.outstanding > 0`; clicking POSTs to the endpoint and opens WhatsApp Web in a new tab.
3. **Security — Key Rotation Guide**: `/app/SECURITY_KEY_ROTATION.md` (4.8 KB, Hinglish) with step-by-step for JWT → Google OAuth secret → Groq → Resend → MongoDB Atlas.

Post-testing cosmetic fixes: scheduler startup log now correctly reports both cron times; interval clamp semantics fixed for `0` input.

## Backlog / Next
- P1: **GST Name Lookup** — wire a paid GST API (Appyflow / ClearTax / IRIS / Masters India) so `/api/gstin/lookup` also returns legal name + address. Awaiting user's choice of provider + API key.
- P1: Reminder Settings UI toggle in `/billing/settings` — endpoint is ready, needs a switch + interval slider.
- P1: PartyProfile "Send Reminder" vs "WhatsApp" button — rename to clarify intent (reminder = overdue chase text; share = generic account summary).
- P2: Purchase Bills server-side `?type=purchase` filter (currently client-side, caps at 500 invoices).
- P2: server.py has grown past 5900 LOC — split into `routers/billing`, `services/email`, `services/scheduler` for maintainability.
- P2: Google Play Data Safety declaration audit.
- P2: Automated MongoDB Atlas backups.
- P2: **User to rotate leaked keys** using SECURITY_KEY_ROTATION.md.
