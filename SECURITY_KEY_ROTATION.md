# Security — Rotate the Leaked Keys (Manual Steps)

**Why**: Aapke purane screenshots me kuch production keys visible ho gayi thi (Mongo, Resend, Groq, JWT, Google OAuth Client Secret). Ye keys **abhi bhi live hain** aur koi bhi inhe use kar sakta hai — MongoDB me aapka data padh sakta hai, Groq/Resend budget kharch kar sakta hai, JWT tokens forge kar sakta hai. Rotation zaroori hai. Sab kuch aap khud dashboard me karenge — main aapke behalf pe login nahi kar sakta.

**Order matters**: JWT → Google → Groq → Resend → Mongo. JWT sabse pehle karo taaki koi purani session hijack na kar sake.

---

## 1) JWT_SECRET (5 min · zero downtime if same string in both places)

1. Generate a new 64-char random string:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
   Copy the output.
2. **Railway** → Project → Variables → `JWT_SECRET` → paste new value → **Deploy**.
3. Wait for the deploy to go green. Sab logged-in users automatically logged out ho jayenge — normal hai.
4. Refresh your Vercel frontend, login se re-verify karo.

---

## 2) Google OAuth Client Secret (10 min)

*Client ID public hi rehta hai — sirf Client Secret rotate karna hai.*

1. https://console.cloud.google.com → APIs & Services → **Credentials**.
2. Apni OAuth 2.0 Client ID kholo (`286375787666-r4ulud9anfuec7208vu4oqcr0hc27s03.apps.googleusercontent.com`).
3. Right side "Client secrets" section → **Add secret** → new secret create karo.
4. Naya secret copy karo.
5. **Railway** → Variables → `GOOGLE_CLIENT_SECRET` → paste new value → **Deploy**.
6. Deploy green hone ke baad login test karo.
7. Wapas Google Console me → purana secret **Disable** → 24h dekho koi failure to nahi → phir **Delete**.

Also confirm **Authorized JavaScript origins** me ye 3 hai:
- `https://apkamunim.com`
- `https://www.apkamunim.com`
- `https://api.apkamunim.com`

---

## 3) Groq API Key (5 min)

1. https://console.groq.com → **API Keys**.
2. Purani key ke saamne **⋯ → Delete**.
3. **Create API Key** → naya token generate karo → copy karo.
4. **Railway** → Variables → `GROQ_API_KEY` → paste → **Deploy**.
5. Verify: app me AI insights / voice parse feature try karo — 200 response aaye.

---

## 4) Resend API Key (5 min)

1. https://resend.com/api-keys → **Revoke** the old key.
2. **Create API Key** → Full Access → naya token copy karo.
3. **Railway** → Variables → `RESEND_API_KEY` → paste → **Deploy**.
4. Verify: app me "Send Overdue Digest" button click karo — inbox me email aaye.

If aapne dedicated sending domain configure kiya hai (SENDER_EMAIL), woh unchanged rahega — sirf key change hui.

---

## 5) MongoDB Atlas (30 min · **sabse zaroori**)

Yahaan do options hain — option A hi karna, option B **last resort** hai.

### Option A: Rotate the DB user password (recommended)

1. https://cloud.mongodb.com → Project → **Database Access**.
2. Wahi user find karo jo aapke `MONGO_URL` me hai (usually `apkamunim` ya similar).
3. **Edit** → **Edit Password** → **Autogenerate Secure Password** → copy karo.
4. Update user, save.
5. Naya connection string banao: `mongodb+srv://<user>:<NEW_PASSWORD>@<cluster>/<db>?retryWrites=true&w=majority`.
6. **Railway** → Variables → `MONGO_URL` → paste new full URL → **Deploy**.
7. Deploy green hone ke baad, backend logs check karo — "MongoDB connection OK" jaisa message dikhna chahiye.
8. Basic health check karo: dashboard load ho raha hai? Sab transactions dikh rahe hain? Ho jaye toh done.

### Option B (only if Option A ke baad kuch weird lage): Restrict IPs

1. Atlas → **Network Access** → check kar lo ki `0.0.0.0/0` allow nahi hai.
2. Sirf Railway ke egress IPs allowlist karo. Railway dashboard → Project → **Settings** → Egress IPs se list mil jayegi.

---

## 6) Verify Everything

Ek naya window (incognito) open karke ye 5 flows karo:
1. Login (email/password) works
2. Google Sign-In works
3. Dashboard loads (data visible)
4. Invoice create karo — save works
5. Send overdue digest — email inbox me aaye

Ho gaya, sab keys rotated. Future me ye baar ki security best practices:
- **Never** paste API keys in screenshots or chats.
- Use Railway/Vercel env vars, never hardcode.
- Set 90-day rotation calendar reminders.
- Enable MongoDB Atlas alerts for unusual access.

---

## Post-rotation TODO
- [ ] `/app/memory/test_credentials.md` update if any test credentials moved.
- [ ] Slack/Discord me team ko bata do (agar team hai).
- [ ] Google Cloud Console → **Audit logs** kholo, past 30 days ke koi anomalous OAuth requests dekh lo.
- [ ] MongoDB Atlas → **Access History** past 7 days review karo.

Koi step atak jaye toh support agent se puchho — Emergent chat me `support` type kar do.
