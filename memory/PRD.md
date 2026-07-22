# PaisaBook — Product Requirements

## Original Problem Statement
> "yaar mujhe ek aisa aaplication bana kr do jisme mai apna kitne paise aaye kitne gaye kitne kisse lene hai kitne kisko dene hai kitne savings account mai aate kitne current account mai"

Hinglish personal finance tracker.

## User Choices (all iterations)
- Auth: JWT email/password
- Multi-currency (INR default + USD/EUR/GBP/AED)
- AI insights via Emergent LLM (Claude Sonnet 4.5) with deterministic fallback
- Theme: Organic & Earthy light (+ dark mode toggle)
- PWA installable
- Family/Shared Ledger

## Data Model
- users, ledgers (personal + shared), accounts, transactions, udhaar, recurring, budgets
- All resources scoped by `owner_id` (ledger_id). Users auto-get a `pl_<uid>` personal ledger.

## Feature history
### v1 MVP (Feb 2026)
Landing, Auth, Accounts, Transactions, Udhaar, Dashboard, Reports (charts), AI PaisaBuddy.

### v2 (Feb 2026)
Edit transaction, Recurring transactions, Budget goals per category.

### v2.1 PWA (Feb 2026)
Manifest + service worker + icons + iOS/Android meta + install prompt component.

### v2.2 Code quality (Feb 2026)
Test creds via env, stable React keys, console.warn on empty catches.

### v3 (Feb 2026)
- **Dark Mode** — sidebar toggle, `html.dark` class, localStorage persistence, meta theme-color update, index.css `.dark` overrides for hardcoded hex-arbitrary color classes
- **CSV/PDF Monthly Export** — reportlab-driven PDF with summary tables, category-colored transactions; CSV with standard headers
- **Budget Breach Notifications** — POST /transactions response includes `budget_alerts[]`; frontend shows toast + browser Notification via service worker `showNotification`
- **Family / Shared Ledger** — ledgers collection with 6-char invite codes, join/switch/leave, data isolation via `owner_id` filter, auto-backfill on first `/auth/me` after upgrade

## Backlog (P1/P2)
- P1: SMS/UPI bank message parser to auto-create transactions
- P1: Voice input ("add 500 rupees chai")
- P1: Bill/receipt photo attachments
- P2: Multi-currency FX conversion with live rates
- P2: Weekly AI digest via WhatsApp/email
- P2: Scheduled reminders for udhaar due dates
- P2: Ownership transfer for shared ledgers
- P2: Server-side push (VAPID) for background budget alerts when app is closed

## Next Action Items
- Ship SMS/UPI parser (biggest UX win — no manual entry needed)
- Extract server.py routers per resource (~1050 lines — nearing complexity threshold)
