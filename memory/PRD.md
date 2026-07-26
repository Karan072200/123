# Apka Munim — Product Requirements

## Original Problem Statement (User's words)
> "yaar mujhe ek aisa aaplication bana kr do jisme mai apna kitne paise aaye kitne gaye kitne kisse lene hai kitne kisko dene hai kitne savings account mai aate kitne current account mai"

## Product Name
**Apka Munim** (renamed from PaisaBook in v4). AI coach = **Munim Ji**.

## Live URLs
- Preview: https://cash-flow-hub-172.preview.emergentagent.com
- Production (Emergent): https://cash-flow-hub-172.emergent.host + https://kawachine.com
- **Self-Hosted (v6 - 23 Jul 2026)**:
  - Frontend (Vercel): https://123-six-eosin.vercel.app
  - Backend (Railway): https://123-production-e68f.up.railway.app
  - DB: User's personal MongoDB Atlas
  - GitHub: github.com/Karan072200/123

## Architecture
- Backend: FastAPI + Motor (MongoDB) + JWT (httpOnly cookie) + bcrypt
- Frontend: React 19 + React Router 7 + Shadcn UI + Recharts + Sonner
- LLM: emergentintegrations · Claude Sonnet 4.5 (with deterministic fallback)
- Deployment: Emergent platform (web + PWA)

## Feature Roadmap
### v1 MVP — Landing, Auth, Accounts, Transactions, Udhaar, Dashboard, Reports, AI PaisaBuddy
### v2 — Edit transaction, Recurring, Budget goals
### v2.1 PWA — Manifest, service worker, icons, iOS/Android install prompt
### v3 — Dark mode, CSV/PDF export, Budget breach notifications, Family/Shared Ledger
### v4 — Rename to **Apka Munim**, UPI/Bank SMS Parser (regex + LLM fallback)
### v5 (this iteration) — App Store readiness (free)
  - **Privacy Policy page** (/privacy) — finance-app compliant
  - **Terms of Service page** (/terms) — includes "not financial advice" clause
  - **Settings page** (/settings) — Data Export (JSON), Account Delete, Notification permission, Legal links
  - **GET /api/auth/me/export** — full user data JSON dump
  - **DELETE /api/auth/me** — permanent account + data cascade
  - Landing footer with disclaimer + Privacy/Terms/Contact links
  - Manifest updated with SMS Parse shortcut + finance category emphasis

### v6 (23 Jul 2026) — Self-Hosting Migration Complete
  - **Backend deployed to Railway** with user's own account (nixpacks.toml + railway.json + Procfile)
  - **Frontend deployed to Vercel** with user's own account (vercel.json + .npmrc + .nvmrc)
  - **MongoDB** connected to user's personal Atlas cluster
  - **Groq LLM** running on user's own API key (replaced emergentintegrations)
  - **Cross-domain cookies fix** (SameSite=None, Secure=True) — critical for Safari/iPhone
  - **CORS** configured Railway → Vercel domain
  - **Custom domain** `apkamunim.com` connected via Namecheap → Vercel
  - **Cost**: ₹550/year (domain only) + $0 infra (all free tiers)
  - Files added: `frontend/.npmrc`, `frontend/.nvmrc`, `frontend/vercel.json` (yarn install/build)

### v7 (25 Jul 2026) — 6 New Features Added (Feature Batch 1)
  - **🎤 Voice Input** — Web Speech API + `/api/voice/parse-transaction` regex+LLM parser. Hinglish speech → transaction dict. `VoiceInput.jsx` integrated inside AddTransactionDialog. Compact mobile-responsive layout.
  - **🎯 Financial Goals (Sapno ka Wallet)** — Full CRUD `/api/goals/*` + `Goals.jsx` page. Emoji picker, color picker, progress bars, contribute dialog with `/goals/{id}/contribute`.
  - **💳 Subscription Tracker** — Full CRUD `/api/subscriptions/*` with monthly/quarterly/yearly cycles, auto monthly_total calc. `Subscriptions.jsx` with quick-add presets (Netflix, Spotify, Prime, etc.), pause/resume toggle.
  - **📊 Financial Health Score** — `GET /api/analytics/health-score` returns 0-100 score + grade (A+/A/B/C/D) + Hinglish motto. Breakdown across savings/budget/udhaar/diversification/activity. `HealthScoreCard.jsx` widget with circular progress + expandable details.
  - **🔥 Daily Streaks** — `GET /api/analytics/streak` computes current + longest streak from txn dates. `StreakCard.jsx` widget with fun message per level.
  - **🎉 Meme Vibe Check** — `GET /api/analytics/vibe-check` returns fun/contextual one-liner based on current spending state + top category. `VibeCard.jsx` widget on dashboard (clickable to refresh).
  - Nav updated: Goals + Subscriptions items added in `Layout.jsx`
  - Routes added in `App.js`: `/goals`, `/subscriptions`
  - Backend Mongo indexes: `goals.owner_id`, `subscriptions.(owner_id, next_billing_date)`

### v8 (25 Jul 2026) — Munim Ji Chat Widget
  - **💬 Conversational AI Chat** — `POST /api/ai/chat` accepts messages history + returns Hinglish contextual reply. Uses user's live financial context (income, expense, udhaar, top categories) for personalized answers.
  - **Floating chat bubble** (`ChatWidget.jsx`) — bottom-right of every authenticated page. Multi-turn conversation, localStorage persistence (last 20 messages), quick prompt suggestions, typing indicator, clear history option.
  - Integrated globally via `Layout.jsx` — appears on Dashboard, Transactions, Udhaar, Goals, Subs, Reports etc.
  - Fallback to canned Hinglish responses if LLM fails.

### v9 (25 Jul 2026) — Goals Savings Plan + New Account Types
  - **Goals enhancement**: `GET /api/goals` now enriches each goal with `breakdown`: `{remaining, percent, days_left, per_day, per_week, per_month, status}`. Status auto-computed: `on_track` / `soon` / `urgent` / `overdue` / `achieved`.
  - **Linked accounts on goals**: `account_id` field added to Goal model + form. Users can link goal to any Savings/Current/Investment/Emergency account.
  - **New account types**: `emergency` (Emergency Fund 🛡️) and `investment` (SIP/FD/Stocks 📈) added to backend Literal + frontend `ACCOUNT_TYPES` with emoji labels.
  - Goals page shows a **"Bachao kitna"** grid inside each card — Daily / Weekly / Monthly savings requirement — color-coded per goal.
  - Status badge on each goal (color-coded pills).
  - Contribute dialog shows daily suggestion tip.

### v10 (25 Jul 2026) — Auth Security Hardening
  - **🔐 Strong password enforcement** — Server-side `validate_password_strength()`: 8+ chars, uppercase, lowercase, digit, special char. Client-side `PasswordStrengthMeter` component with 5-bar visual + checklist.
  - **🔑 4-6 digit PIN login** — `POST /auth/pin/set` (requires current password), `POST /auth/pin/verify` (login via email+PIN), `DELETE /auth/pin`, `GET /auth/pin/status`. Rate-limited: 5 failed attempts → 15 min lock (`pin_attempts` collection).
  - **📧 Forgot / Reset Password** — `POST /auth/forgot-password` generates secure token (1hr expiry, `password_reset_tokens` collection with TTL), calls `_send_reset_email()`. `POST /auth/reset-password` validates token + strong password + sets new hash. Frontend `ForgotPassword.jsx` + `ResetPassword.jsx` pages.
  - **Resend integration** — `_send_reset_email` uses `resend` Python SDK if `RESEND_API_KEY` env set, else falls back to logging + returns `dev_link` in response (dev mode). Beautiful Hinglish HTML email template with brand.
  - **Login page redesigned** — Tabs for Password / PIN login modes. "Bhool gaye?" link → `/forgot-password`.
  - **Register page** — Password strength meter with real-time feedback. Submit disabled until strong.
  - **Settings page** — New "PIN Login" section with setup dialog (PIN + confirm PIN + current password).
  - Requires user action: Add `RESEND_API_KEY` env in Railway to enable actual email sending (currently `dev_link` returned in response).

## Data Model
- `users` — id, email (unique), name, password_hash, currency, personal_ledger_id, current_ledger_id
- `ledgers` — id, name, type (personal/shared), owner_user_id, members[], invite_code
- `accounts`, `transactions`, `udhaar`, `recurring`, `budgets` — all scoped by owner_id (ledger_id)

## App Store Readiness Checklist
- [x] Privacy Policy URL (finance-app compliant)
- [x] Terms of Service URL
- [x] Financial disclaimer ("not investment/tax/legal advice")
- [x] Data Export (user self-service — GDPR & Play Store Data Safety)
- [x] Account Delete (user self-service — GDPR & Play Store Data Safety)
- [x] Notification permission opt-in
- [x] PWA manifest with description, categories, shortcuts
- [x] Maskable icons (192/512)
- [x] Contact email (support@apkamunim.app)
- [ ] Google Play Developer account ($25 one-time) — user action
- [ ] Apple Developer Program ($99/year) — user action
- [ ] Mobile Agent (Expo/React Native) native app — requires paid Emergent subscription
- [ ] TWA via Bubblewrap for Android-only — alternative path
- [ ] Business verification docs (Apple 5.4 finance guideline)
- [ ] App store screenshots

## Testing Coverage (iteration 7)
- Backend: 51/51 pass (SMS parser 8 scenarios + export + delete cascade + regression)
- Frontend: full Playwright end-to-end verified

## v11 — Global Search (26 Jul 2026)
- **Backend**: `GET /api/search?q=<query>` searches transactions (note/category/account/amount), udhaar (person/note/type/phone/amount), accounts (name/type), goals (name), subscriptions (name/category)
- **Frontend**: Command-palette style modal (`GlobalSearch.jsx`) triggered by:
  - Sidebar "Search kuch bhi..." button with ⌘K / Ctrl+K hint
  - Mobile top-nav search icon
  - Global `Ctrl+K` / `Cmd+K` keyboard shortcut
- **Categorized results**: Pages/Features (11 pages), Quick Actions (8 including Add Transaction, Toggle Dark Mode, Open AI Chat, Logout), and live data from DB
- **Fix**: `shouldFilter={false}` on cmdk `<Command>` (was hiding server results due to UUID `value` mismatch)
- Client-side filters static features/actions; server-side debounced API call (250ms) for user data
- All results have `data-testid` for automation

## Backlog / Next Ideas
- **Push `fix-cross-domain-cookies` branch to GitHub** (SameSite=None fix — critical for Safari/iOS logins)
- Custom domain setup on Vercel (e.g., apkamunim.com)
- Splitting server.py into resource routers (~1275 LOC now)
- Ownership transfer for shared ledgers
- Bulk SMS parsing (paste multiple, batch add)
- Voice input for transactions
- Bill/receipt photo attachments with OCR
- Weekly WhatsApp AI digest
- Multi-currency live FX conversion
- Server-side push (VAPID) for offline notifications
- Mobile native app via Emergent Mobile Agent
