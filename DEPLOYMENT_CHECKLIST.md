# Apka Munim — Deployment Checklist

Stack: **React (Vercel)** + **FastAPI (Railway)** + **MongoDB Atlas**

## ✅ 1. MongoDB Atlas
- [ ] Free M0 cluster created
- [ ] Database user created (username + strong password)
- [ ] Network Access → `0.0.0.0/0` allowed (Railway IPs rotate)
- [ ] Connection string copied

## ✅ 2. Backend on Railway
- [ ] Repo `Karan072200/123` connected, root = `/backend`
- [ ] Environment variables set (see `backend/.env.example`):
  - `MONGO_URL` (Atlas connection string)
  - `DB_NAME=apkamunim`
  - `CORS_ORIGINS=https://<your-vercel-domain>.vercel.app`
  - `JWT_SECRET` (32+ random hex chars, e.g. `python -c "import secrets; print(secrets.token_hex(32))"`)
  - `GOOGLE_CLIENT_ID` (from Google Cloud Console)
  - **Email (pick ONE path):**
    - **Path A — Direct Resend (recommended for Railway):** `RESEND_API_KEY=re_xxx` + `SENDER_EMAIL=noreply@yourdomain.com` + `EMAIL_FROM_NAME=Apka Munim`
    - **Path B — Emergent proxy (Emergent hosting only):** `EMERGENT_EMAIL_KEY=<value>`
  - If neither set, weekly digest silently skips — that's fine for launch
- [ ] Start command auto-detected from `Procfile` / `railway.json`:
      `uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] Public domain generated
- [ ] Test: `curl https://<railway-url>/api/healthz` → `{"status":"ok","db":"up"}`

## ✅ 3. Frontend on Vercel
- [ ] Repo connected, root = `/frontend`
- [ ] Framework: Create React App
- [ ] Env vars (see `frontend/.env.example`):
  - `REACT_APP_BACKEND_URL=https://<railway-url>` (no trailing slash)
  - `REACT_APP_GOOGLE_CLIENT_ID=<same-as-backend>`
- [ ] Deploy → get Vercel URL
- [ ] Test: open URL → login page renders

## ✅ 4. Cross-Wire
- [ ] Railway `CORS_ORIGINS` includes Vercel prod + preview URLs (comma-sep)
- [ ] Google Cloud Console → OAuth Client → Authorized JavaScript origins:
  - `https://<vercel-domain>.vercel.app`
  - Any custom domain
- [ ] Redeploy backend (Railway auto-restarts on env change)

## ✅ 5. Smoke Test the Live App
- [ ] Register a new user
- [ ] Login with email/password
- [ ] Login with Google (should redirect, consent, back to app)
- [ ] Create a sale invoice → number is `INV/2526/0001` format
- [ ] Print/PDF invoice — logo, GSTIN header, T&C footer, UPI QR all render
- [ ] WhatsApp share button opens wa.me link
- [ ] Language switcher → Hinglish → nav labels change

## ✅ 6. Security Hardening (post-launch)
- [ ] Rotate `JWT_SECRET` from the placeholder shipped in the repo
- [ ] Tighten `CORS_ORIGINS` from `*` fallback to explicit domain list
- [ ] Enable MongoDB Atlas backups (M0 has none — upgrade to M10 for prod-critical data)
- [ ] Set up an uptime monitor (UptimeRobot free) on `/api/healthz`

## Common Issues & Fixes
| Symptom | Fix |
|---|---|
| CORS blocked from Vercel → Railway | `CORS_ORIGINS` env on Railway missing/incorrect |
| Atlas connection timeout | Network Access whitelist missing `0.0.0.0/0` |
| Google Sign-In `redirect_uri_mismatch` | Vercel URL not in OAuth Authorized origins |
| APScheduler weekly job silent | `EMERGENT_EMAIL_KEY=disabled` — expected, skip |
| Railway build fails on requirements.txt | Check Python version in `nixpacks.toml` matches your local |
| Frontend build fails on Vercel | Confirm Root Directory is `frontend`, framework is CRA |
