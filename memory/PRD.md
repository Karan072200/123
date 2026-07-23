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
  - **Cost**: $0/month (Railway hobby + Vercel hobby + Atlas free)
  - Files added: `frontend/.npmrc`, `frontend/.nvmrc`, `frontend/vercel.json` (yarn install/build)

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
