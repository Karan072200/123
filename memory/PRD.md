# PaisaBook — Product Requirements

## Original Problem Statement
> "yaar mujhe ek aisa aaplication bana kr do jisme mai apna kitne paise aaye kitne gaye kitne kisse lene hai kitne kisko dene hai kitne savings account mai aate kitne current account mai"

Hinglish personal finance tracker: track income, expenses, udhaar (lene/dene), multi-account balances.

## User Choices
- Auth: JWT email/password
- Multi-currency: INR default + USD/EUR/GBP/AED
- AI insights: Emergent LLM (Claude Sonnet 4.5) with deterministic fallback
- Theme: Organic & Earthy light theme
- Extras: Categories, Charts, Monthly reports, Udhaar reminders

## Architecture
- Backend: FastAPI + Motor (MongoDB), JWT httpOnly cookies, bcrypt
- Frontend: React 19 + React Router 7 + Shadcn UI + Recharts + Sonner
- LLM: emergentintegrations · Anthropic Claude Sonnet 4.5

## Data Models
- users, accounts, transactions, udhaar, **recurring**, **budgets**

## Implemented Features
### v1 (MVP — Feb 2026)
- Landing, Auth (register/login/logout/me), Multi-currency
- Accounts CRUD with computed balance
- Transactions CRUD with search/filter
- Udhaar Lene/Dene with settle + WhatsApp reminder
- Dashboard bento grid + Recent transactions
- Reports: Bar (income vs expense), Line (savings), Pie (categories)
- AI PaisaBuddy coach (Claude Sonnet 4.5 + deterministic fallback)

### v2 (Feb 2026 — this iteration)
- **Edit Transaction** — pencil icon on /transactions opens dialog pre-filled
- **Recurring Transactions** — daily/weekly/monthly rules with auto-generation on dashboard load and manual "Run now"
- **Budget Goals** — monthly per-category limit with green/amber/red progress bars, overall summary card, upsert on save

## Backlog (P1)
- Family / Shared Ledger
- Photo/receipt attachments
- Live FX for multi-currency conversion
- Voice input for transactions
- UPI/bank SMS parsing
- CSV/PDF export
- Scheduled reminders (email/SMS/WhatsApp) for udhaar due dates
- Dark mode toggle
- Weekly AI digest

## Next Action Items
- Ship one of: Family Ledger, SMS parsing, or Voice input
- Add email reminder scheduling for udhaar due dates
