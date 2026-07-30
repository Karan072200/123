# Apka Munim — PRD & Change Log

## Problem
Apka Munim is a Hinglish personal-finance + billing app (React + FastAPI + MongoDB) sourced from `Karan072200/123`. This iteration was a **cleanup + stabilization pass** — no new features, only bug fixes, missing endpoint wiring, env/rate-limit hardening, and frontend routing gaps.

## Personas
- Personal-finance user tracking income, kharcha, udhaar in Hinglish
- Small-business owner using the Billing side (invoices, quotations, parties, inventory)

## Static core requirements
- Auth (email/password + Google), JWT via cookies + Bearer
- Multi-ledger scoping (personal + shared)
- Transactions, accounts, budgets, goals, warranties, kids, splits, investments
- Billing: invoices, quotations, proforma, challans, credit/debit notes
- Voice / SMS / LLM insights (Anthropic → Groq → Emergent)
- Public account-deletion request (unauthenticated form)
- Slowapi rate-limiting on auth + sensitive endpoints

## What was implemented in this pass (Feb 2026)

### Backend (`backend/server.py`)
- Removed broken duplicate `DELETE /api/user/delete-account` that used `current_user["_id"]` (KeyError) and wrong scope.
- Rewrote `POST /api/public/delete-account-request` on the `api` router with `@limiter.limit("5/hour")`, `EmailStr` validation, `request: Request` param, UUID id, ISO created_at.
- Replaced `os.environ["JWT_SECRET"]` / `os.environ["GOOGLE_CLIENT_ID"]` with `.get()` + explicit `RuntimeError` — matches the existing `MONGO_URL` pattern.
- Added `WarrantyUpdateIn` (all Optional) and switched `PATCH /warranties/{id}` to it; returns 404 if missing.
- Added `PATCH /kids/{kid_id}` (name/emoji/monthly_allowance), 404 if missing.
- Added `PATCH /accounts/{account_id}` (name/type/color) via `AccountUpdateIn`, 404 if missing.
- Added `@limiter.limit("30/hour")` to `POST /voice/parse-transaction` + gated LLM fallback behind premium check (`_sync_premium_status`) with free-tier daily counter (`_check_daily_free_limit`, `voiceLlmCount`, 5/day). Free users hitting the limit get HTTP 402.
- Cleaned up the shutdown handler which had stray endpoint code appended to it.

### Frontend (`frontend/src/App.js`)
- Imported `Landing` and `InvoiceCreate`.
- New `RootRoute` component: shows `Landing` for logged-out users, `Dashboard` (in `Layout`) for authed users. Preserves all internal links pointing at `/`.
- Added `/dashboard` route so authed users can link directly.
- Added `/billing/invoices/new` and `/billing/invoices/:id/edit` routes to `InvoiceCreate`.
- Deleted the old `pages/BillingDashboard.jsx` (superseded by `pages/billing/BillingDashboardWorkspace.jsx`).
- `yarn build` compiles clean.

### Env
- Added dev `JWT_SECRET` and placeholder `GOOGLE_CLIENT_ID` to `backend/.env` so the graceful startup check passes locally.

## Smoke tests run
- Register → login → me → PATCH kids/warranties/accounts → delete /auth/me → all pass.
- PATCH on missing ids → 404 (not silent 200).
- Voice parse with amount → regex path, returns 200 with parsed txn.
- Old broken `DELETE /api/user/delete-account` → 404 (removed).
- `POST /public/delete-account-request` valid email → 200; invalid email → 422 (Pydantic EmailStr); burst of 10 → HTTP 429 after 5.
- Frontend `yarn build` → compiled successfully.

## Backlog / Next
- P1: Add a `WarrantyReturnUpdate` field or full replacement flow if UI needs it.
- P1: Standalone rate-limit test for `voice/parse-transaction` (currently only smoke-checked regex path).
- P2: Move deleted-account admin review UI (list `deletion_requests` collection).
- P2: Legacy `BillingDashboard` route (`/billing/legacy`) if any bookmark exists — currently intentionally omitted.
