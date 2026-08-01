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
Standalone sidebar + header, 4 new pages. **Iteration 11: 100% pass.**

## ERP Billing Workspace — Phase 2
Convert Documents endpoint + UI, PartyProfile, Purchase Bills first-class page, Statement PDF, GSTIN structural autofill. **Iteration 12: 100% pass.**

## ERP Billing Workspace — Phase 3 (gap sweep)
Clickable Parties cards, sidebar routes no longer exit workspace, Purchase Bill + Sales Order in InvoiceCreate types, Statement PDF button on ledger rows. **Iteration 13: 100% pass.**

## ERP Billing Workspace — Phase 4
Convert AlertDialog, Auto WhatsApp Reminders (Mon 09:00 IST scheduler + manual per-party endpoint + PartyProfile Send Reminder button), Security Key Rotation guide. **Iteration 14: 100% pass.**

## Google Sign-In "origin not allowed" fix (current, iteration 17: 100% pass)

**Symptom**: User reported `bhai google se login nahi ho raha`. Browser console showed `[GSI_LOGGER]: The given origin is not allowed for the given client ID` — the preview URL `https://finance-hardening.preview.emergentagent.com` is NOT in Google Cloud Console's Authorized JavaScript origins list (only `apkamunim.com` / `www.apkamunim.com` are).

**Root cause**: Config-side, only the user can fix. Main agent has no Google Cloud Console access.

**Code-side mitigation** — three iterations landed the right approach:
- iter15: added inline diagnostic banner `<GoogleAuthErrorHelp/>` + guide doc `/app/GOOGLE_OAUTH_FIX.md`.
- iter15 finding: `@react-oauth/google`'s `onError` doesn't fire for GSI origin blocks — banner never surfaced.
- iter16: switched trigger to a `console.error` sniffer hook `useGsiOriginErrorDetector`.
- iter16 finding: GSI writes the log from inside a **cross-origin iframe** (`ssl.gstatic.com`), so the parent-frame `console.error` patch never catches it.
- iter17: switched to a **host-allowlist** trigger — new util `/app/frontend/src/lib/googleOrigins.js` exports `KNOWN_GOOD_GOOGLE_HOSTS = {apkamunim.com, www.apkamunim.com}` and `isKnownGoodGoogleOrigin()`. Login.jsx + Register.jsx render the banner proactively on any host outside the allowlist. Banner now has a dismiss (X) button that persists per-origin in `localStorage`.

**Files**:
- `/app/frontend/src/lib/googleOrigins.js` (new — host allowlist)
- `/app/frontend/src/components/auth/GoogleAuthErrorHelp.jsx` (rewritten — dismiss + persistence)
- `/app/frontend/src/pages/Login.jsx` + `Register.jsx` (use `isKnownGoodGoogleOrigin()`)
- `/app/GOOGLE_OAUTH_FIX.md` — Hinglish step-by-step
- `/app/memory/test_credentials.md` — updated with preview URL note

**User action required**: Open `/app/GOOGLE_OAUTH_FIX.md` and add the preview origin to Google Cloud Console → Authorized JavaScript origins. 2-minute task.

## Backlog / Next
- P1: **User action** — add preview URL + all production origins to Google Cloud Console (see GOOGLE_OAUTH_FIX.md).
- P1: **Rotate leaked keys** using SECURITY_KEY_ROTATION.md.
- P1: **GST Name Lookup** — wire a paid GST API (Appyflow / ClearTax / IRIS / Masters India). Awaiting user's choice of provider + API key.
- P1: Reminder Settings UI toggle in `/billing/settings` — endpoint ready, needs a switch + interval slider.
- P1: Rename PartyProfile "Send Reminder" vs "WhatsApp" buttons for clarity.
- P2: Purchase Bills server-side `?type=purchase` filter.
- P2: server.py has grown past 5900 LOC — split into routers/services.
- P2: Top-5 Overdue Customers widget on ERP dashboard.
- P2: Reminder email should attach the Statement PDF, not just a WhatsApp link.
- P2: Google Play Data Safety declaration audit.
- P2: Automated MongoDB Atlas backups.
