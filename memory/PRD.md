# PaisaBook — Product Requirements

## Original Problem Statement (User's words, Hinglish)
> "yaar mujhe ek aisa aaplication bana kr do jisme mai apna kitne paise aaye kitne gaye kitne kisse lene hai kitne kisko dene hai kitne savings account mai aate kitne current account mai"

Translation: An app to track: money coming in, money going out, whom I need to receive from (udhaar), whom I need to pay, how much in savings vs current account.

## User Choices (from ask_human)
- Auth: JWT-based email/password
- Multi-currency: INR default + USD/EUR/GBP/AED
- AI insights: Yes (Emergent LLM key, Claude Sonnet 4.5)
- Theme: Modern light (Organic & Earthy)
- Extras: Categories, Charts, Monthly reports, Udhaar reminders

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) at /api/*, JWT via httpOnly cookies, bcrypt hashing.
- **Frontend**: React 19 + React Router 7 + Shadcn UI + Recharts + Sonner + Tailwind.
- **LLM**: emergentintegrations with Anthropic Claude Sonnet 4.5 (JSON insights, has deterministic fallback).

## Data Models (MongoDB collections)
- users: id, email (unique), name, password_hash, currency, created_at
- accounts: id, user_id, name, type, opening_balance, currency, color
- transactions: id, user_id, account_id, account_name, type (income|expense), amount, category, note, date
- udhaar: id, user_id, person_name, phone, type (lene|dene), amount, note, due_date, status (pending|settled)

## Implemented (Feb 2026)
- Landing page (Hinglish hero, feature grid)
- Auth: Register, Login, Logout, Me, Currency update
- Accounts CRUD with live balance calculation
- Transactions CRUD with type/account/search filters
- **Edit Transaction** via pencil icon (reuses shared dialog)
- **Recurring Transactions**: daily/weekly/monthly rules with active toggle, "Run now", auto-generation on dashboard load
- **Budget Goals per category**: monthly limit with live spent/remaining/percent, green→yellow→red progress bar
- Udhaar (Lene/Dene) tracker with settle, delete, WhatsApp/clipboard reminder
- Dashboard with 4 stat cards, recent txns, account list
- Reports: Bar chart (income vs expense), Line chart (savings), Pie chart (categories), Account type breakdown
- AI Insights via Claude Sonnet 4.5 with JSON output (headline, summary, 3-5 tips) — Hinglish + deterministic fallback
- Multi-currency (5 currencies)
- Sidebar layout with mobile top-nav

## User Personas
- Indian consumer wanting simple personal finance tracker with cultural context
- Small business owner tracking multiple accounts + udhaar

## Backlog / Next Iterations
- P1: Family / Shared Ledger (shared workspace with per-member breakdown)
- P1: Bill reminders (email/WhatsApp on due dates)
- P2: Photo/receipt attachments on transactions
- P2: Multi-currency with live FX rates
- P2: CSV/PDF export of monthly report
- P2: SMS/UPI parsing to auto-create transactions
- P2: Voice input ("add 500 rupees chai")
- P2: Weekly AI digest via WhatsApp/email
- P2: Dark mode toggle

## Next Action Items
- Verify testing subagent report
- Address any critical bugs
- Prompt user for optional enhancements
