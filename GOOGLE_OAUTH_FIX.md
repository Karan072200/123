# Google Sign-In Fix — "Origin Not Allowed" (2 min)

Aapke browser console me ye error aata hai:

```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

Iska matlab: **jis URL par aap login try kar rahe ho, woh Google Cloud Console ke Authorized origins list me nahi hai.** Solution 2 minute ka hai, sirf aap kar sakte ho (mere paas Google Console access nahi hai).

---

## Step-by-Step Fix

### 1. Copy the current origin
Jis URL par aap login page dekh rahe ho, uska scheme + host (path nahi). Common values:

| Environment | Origin to add |
|---|---|
| **Production** (custom domain) | `https://apkamunim.com` |
| **Production (www)** | `https://www.apkamunim.com` |
| **Preview (Emergent)** | `https://finance-hardening.preview.emergentagent.com` |
| **Localhost (dev)** | `http://localhost:3000` |

App ke login page par ab ek amber "Google Sign-In blocked" banner aata hai jisme exact origin + copy button hai — usse copy karo.

### 2. Google Cloud Console kholo
https://console.cloud.google.com/apis/credentials

Correct project select karo (jismai aapki OAuth Client ID configured hai).

### 3. Apni OAuth 2.0 Client ID kholo
Client ID: `286375787666-r4ulud9anfuec7208vu4oqcr0hc27s03.apps.googleusercontent.com`

### 4. "Authorized JavaScript origins" section me add karo
- **+ Add URI** button click karo.
- Origin paste karo (step 1 se copy kiya hua).
- **Save** click karo (bottom of the page).

### 5. Wait 30 seconds
Google Console changes me ~30 sec lagte hain propagate hone me.

### 6. App par wapas aao aur refresh (Ctrl+Shift+R)
Fir Google sign-in button click karo — chalna chahiye.

---

## Which origins should be added permanently?

Ek baar sab add kar do — future me issue nahi hoga:

- `https://apkamunim.com` (production)
- `https://www.apkamunim.com` (www subdomain)
- `https://finance-hardening.preview.emergentagent.com` (Emergent preview)
- `http://localhost:3000` (agar local dev karte ho)

**Redirect URIs bhi add karo** (same list, saath me `/auth/google` suffix):
- `https://apkamunim.com/auth/google`
- `https://www.apkamunim.com/auth/google`
- `https://finance-hardening.preview.emergentagent.com/auth/google`
- `http://localhost:3000/auth/google`

Note: `@react-oauth/google` GoogleLogin button ID token flow use karta hai, isliye technically redirect URI zaroori nahi hai — lekin future-proofing ke liye add karna behtar hai.

---

## Common gotchas
- **HTTPS vs HTTP**: production URLs `https://` hi honi chahiye. `http://` sirf `localhost` ke liye allowed hai.
- **Trailing slash**: origin me path/trailing slash NAHI hona chahiye. `https://apkamunim.com/` galat, `https://apkamunim.com` sahi.
- **www vs non-www**: dono alag origins hain — dono add karo.
- **Preview URL badalta rehta hai**: agar Emergent me app rename ho gaya toh preview URL change hoga. Naya URL add karo.
- **Publishing status**: agar OAuth Consent Screen "Testing" mode me hai aur aap non-test user ke saath try kar rahe ho, error alag aayega. Screen me "Published" karo ya test users me email add karo.
- **Client Secret rotate**: agar aapne Client Secret rotate kiya to backend Railway `GOOGLE_CLIENT_SECRET` env var bhi update karo. Client ID same rehta hai.

---

## Verification checklist
Fix karne ke baad:

- [ ] Login page par Google button click karo — Google account picker popup aaye.
- [ ] Account select karo — dashboard par land ho.
- [ ] Register page par bhi test karo.
- [ ] Browser DevTools → Console me `[GSI_LOGGER]` error nahi aaye.

Sab tick? Fix successful.
