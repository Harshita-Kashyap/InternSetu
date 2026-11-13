# InternSetu: how it works, what is done, how to test (plain language)

InternSetu helps a young person (often with little English and no career guidance) find 3-5 suitable PM Internship Scheme (PMIS) internships, and explains each match in simple words. **It never applies on the person's behalf and never collects Aadhaar.**

## 1. The three parts
```
Phone app (mobile/)  ─┐
                      ├──►  Backend server (backend/)  ──►  Database (PostgreSQL)
Website (web/)       ─┘        │  login, profile, matching, explanations
                               └─ data/  (750 sample internships, 296 skills, 70 cities, 5000 sample candidates)
```
Both apps look different but call the same server, so results are identical.

## 2. What happens when someone uses it (the flow)
1. **Register / log in**: name + email + password, then enter the 6-digit code emailed to you (proves the email is yours); must tick consent. Log in with email (or mobile) + password; forgot password -> code on email -> new password.
2. **Profile in 3 steps**: education -> skills (tap activities like "repaired a phone", or pick skills grouped by category) -> preferences (home city, willing to move, sectors).
3. **Matching** (the "engine", `backend/app/engine/`):
   - *Eligibility*: is the person's education enough? Does the internship need skills they lack? (kept separate from the score)
   - *Score* (0-100) = 35% skills + 20% interests/sector + 20% location + 25% education/field.
   - *Tiers*: "Eligible now" first; if fewer than 3, "Almost there" (1-2 skills missing, with a learning suggestion); if still fewer, nearest options, own state first. Education is never relaxed.
   - *Explanation*: each result gets short reasons in English / Hindi / Marathi / Bengali, from fixed templates (no AI makes things up).
4. **Results screen**: cards with score, reasons, missing skills, "Save", and "Apply on PMIS" (opens the official portal, with a pre-check of documents).
5. **Extras**: edit profile, saved list, download my data, withdraw consent, delete account (confirm with password **or an emailed code**), dark mode, language switch.

## 3. Status map

| Area | Status |
|---|---|
| Matching engine, tiers, explanations (en/hi/mr/bn) | Done and tested |
| Register/login, consent, profile, saved, delete account | Done and tested |
| Website + mobile screens | Done; type-checked, tested and built in session 10-11 (not yet walked through on a real phone/browser) |
| Skills grouped by category + "Clear all" | Done (session 9), web + mobile |
| Password reset by emailed 6-digit code | Done and tested (session 9; test fixed in session 10) |
| **Bengali (bn)** | **Done in session 10** on web (500/500 strings), mobile (300 strings) and backend (reasons, PMIS, activities, email). Machine-translated, **not reviewed by a native speaker**. te, ta, gu still to do |
| **Sign-up with an emailed verification code** (replaces SMS and the earlier passwordless login) | **Done in session 14**, web + mobile + backend, tested. Needs SMTP keys: **without email sending nobody can register** |
| **Delete account with an emailed code** (#40) | **Done in session 11** (password still works too) |
| Retry on weak network | Done (session 9) |
| Saved results when offline + installable web app (#18 first part) | Done (session 9); web build verified in session 10 |
| Accessibility code pass (contrast, labels, page language, tap sizes) | Done in code (session 9), device audit still to do |
| **Illustrated, icon-led screens** (profile steps, login, results; icon tiles; Read aloud on step headers) | **Done in session 13**, not yet checked on real screens |
| **Read this page on every screen, microphone (voice input) on search and typing boxes, art on register / forgot-password / account** | **Done in session 14**; voice depends on the browser/phone (see USER_STEPS.md) |
| Password, email and emailed code are all **mandatory** at sign-up | Done (session 14); passwordless login removed |
| **Mobile offline banner, read-aloud on result cards, web service worker (static files)** | **Done in session 12**, tested by type-check/build only; check on a real device |
| Human-labelled quality check, pilot with real users | Not done (needs people) |

## 4. How to test (copy-paste)
**Automatic tests (run first)**
```
cd backend && pip install -r requirements.txt && pytest          # engine, API, OTP, auth (163 passed in session 12)
cd web     && npm ci && npx tsc --noEmit && npx vitest run         # types, translations (60 passed) ; npx next build
cd mobile  && npm ci --legacy-peer-deps && npx tsc --noEmit && npx jest   # 13 passed
```
**By hand (10 minutes)**
1. Start backend (`uvicorn app.main:app`) and web (`npm run dev`). Register a new account.
2. Skills page: open a category, pick 3 skills, check the badge count, type in search, press **Clear all** (everything deselects).
3. Finish profile -> you get 3-5 internships. Switch language to Hindi or Bengali: reasons change.
4. Forgot password: enter your email -> with no SMTP set, the 6-digit code is printed in the server log (search "EMAIL (dev mode") -> enter code + new password -> log in.
5. Open the results once while online. Then turn on airplane mode (web: DevTools > Network > Offline) and reload the results page: you should see the same results with the banner "You are offline. Showing results saved on this device.". Log out and repeat: the saved copy must be gone and you get the normal error.
6. Web: in Chrome on a phone, menu > "Add to Home screen" should offer InternSetu with its icon.

## 5. Password reset by email code: how it works
1. User enters email. Server answers the same sentence whether the account exists or not (so nobody can probe for accounts).
2. Server computes a 6-digit code from a secret key + the user + the time (5-minute slot) + the current password hash, and emails it. **Nothing is stored in the database.**
3. User types code + new password. The server recomputes the code and compares; valid 5-10 minutes; 5 wrong tries lock it for 15 minutes; one new code per minute.
4. After the password changes, the old code can no longer match (single use).
Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` in `backend/.env` to send real emails (Gmail app password, Brevo or Resend free tiers work). Without them the code is only logged, which is perfect for demos.

## 5b. Sign-up code, password reset code and deletion code (sessions 11-14)
Same code mechanism as section 5, with a different "purpose" so a code for one thing never works for another.
- **Sign-up:** form -> "Send verification code" -> enter the 6-digit code -> account created (the code only works for that email, once, for 5-10 minutes).
- **Delete account:** Account page -> Delete -> "Email me a code instead" -> enter the code. The password also still works.
- Test by hand: with no SMTP set, the code is printed in the server log (on your own computer only) (search "EMAIL (dev mode").
- Limits: 5 wrong guesses lock 15 minutes; one new code per minute; unknown emails get the same reply (no account probing). The limiter and used-code list are in memory (one server); use Redis/DB before running several servers.

## 6. SMS or email OTP? (decided: email)
| | Email OTP | SMS OTP |
|---|---|---|
| Cost | Free (free tiers) | Paid per message (about Rs 0.15-0.25 each in India via MSG91 type providers, much more via Twilio), plus a business/DLT registration that takes days; check current prices |
| Setup | An SMTP account, 10 minutes | Provider account + approved message template |
| Reach | Needs an email address (many target users have only a phone) | Works for everyone with a phone |
| Verdict for this project | **Chosen and built (session 11)** | Dropped (not free); mention as future work for a real launch |

## 7. AI voice-to-skills (optional design, not built)
Phone keyboard mic (chosen) is enough. The optional AI version: person speaks or types "I repair motors and know Tally" -> our server sends **only that sentence + the list of skill names** (no name, no contact details) to an AI model with the instruction "return the matching skill ids as JSON" -> server checks every id exists in our taxonomy -> pre-selects those chips for the person to confirm. If the AI call fails or is switched off, the existing keyword search (`/taxonomy/normalize`) is used. It needs a consent line, an API key kept on the server, and a per-user daily limit.
