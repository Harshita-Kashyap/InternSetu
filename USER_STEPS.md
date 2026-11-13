# USER_STEPS.md: what you need to do, step by step

Written in session 14 (7 Nov 2026). Do the steps **in order**. Each step says how long it takes, what to do, and what you should see. When a step fails, copy the error and send it to me with the step number.

**Order and time**

| # | Step | Time | Why it matters |
|---|---|---|---|
| 1 | Unzip and install | 20 min | Nothing works without it |
| 2 | Start backend, web and mobile | 15 min | You cannot test anything before this |
| 3 | Set up email (SMTP) | 15 min | **Sign-up needs an emailed code, so without email nobody can register on a real site** |
| 4 | Click-through check | 30 min | Finds broken screens |
| 5 | Voice on a phone (optional dev build) | 60 min | Microphone input on mobile needs it |
| 6 | Lighthouse audit (web) | 20 min | Accessibility and speed score |
| 7 | TalkBack check (Android) | 20 min | Screen-reader check |
| 8 | Hindi/Marathi/Bengali review | 20 min of a friend's time | Text is machine-translated |
| 9 | Test with 2-3 real users | 15 min each | Proves the screens are easy |
| 10 | Send me results | 10 min | I fix what you found |
| 11 | Put it online (when ready) | 60 min | `DEPLOYMENT.md` has the full list |

---

## Step 1. Unzip and install (about 20 minutes)

> After any new zip: run `npm install` in `web` and `npm install --legacy-peer-deps` in `mobile` again, because new packages (fonts, icons, speech) are added from time to time. Missing-module errors always mean this step was skipped.

You need installed: **Python 3.11+**, **Node.js 20+**, **Git** (optional). Check with `python --version` and `node --version`.

1. Unzip `InternSetu_session*.zip`. You get a folder called `InternSetu` with `backend`, `web` and `mobile` inside.
2. Open a terminal (PowerShell on Windows) in `InternSetu\backend` and run:
   ```
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
3. Open `backend\.env` in a text editor. Set `SECRET_KEY` to a long random text (for example 40 random letters and numbers). Leave the rest for now.
4. In a second terminal, in `InternSetu\web`:
   ```
   copy .env.example .env.local
   npm install
   ```
5. In a third terminal, in `InternSetu\mobile`:
   ```
   copy .env.example .env
   npm install --legacy-peer-deps
   ```
6. **Check:** in the backend terminal (with `.venv` active) run `pip install -r requirements-dev.txt` and then `pytest --cov=app --cov-config=.coveragerc` (prints the coverage table; about 89% of application code). You should see about **199 passed** (it takes 2-3 minutes). In `web` run `npx tsc --noEmit` and `npx vitest run` (60 passed). In `mobile` run `npx tsc --noEmit` and `npx jest` (50 passed). If any fails, send me the message.

## Step 2. Start everything (about 15 minutes)

1. **Backend** (terminal 1, in `backend`, `.venv` active):
   ```
   alembic upgrade head
   python -m app.scripts.load_datasets --all
   python -m app.scripts.create_admin
   uvicorn app.main:app --reload
   ```
   `create_admin` asks for an admin email and password: write them down. **Check:** open http://localhost:8000/docs; you should see the API page.
2. **Web** (terminal 2, in `web`): `npm run dev`. **Check:** open http://localhost:3000; you should see the login page with a picture.
3. **Mobile** (terminal 3, in `mobile`): open `mobile\.env` and set `EXPO_PUBLIC_API_URL`:
   - Android emulator: `http://10.0.2.2:8000`
   - Real phone: `http://YOUR-COMPUTER-IP:8000` (find the IP with `ipconfig`; phone and computer must be on the same Wi-Fi)
   Then run `npx expo start` and scan the QR code with **Expo Go**. **Check:** the login screen appears on your phone.

If the phone cannot reach the backend, start it with `uvicorn app.main:app --reload --host 0.0.0.0` and allow port 8000 in the Windows firewall.

## Step 3. Set up email so codes are sent (about 15 minutes) - Done (Gmail)

Sign-up, forgot-password and delete-account all send a 6-digit code by email. **Until you finish this step, the code is only printed in the backend terminal** (search for `EMAIL (dev mode`). That is fine for testing alone, but real people cannot use the site.

**Gmail (quickest, free):**
1. Open https://myaccount.google.com/security and turn on **2-Step Verification**.
2. Search for **App passwords**, create one (name it `InternSetu`) and copy the 16-character password.
3. Open `backend\.env` and fill in (no spaces after `=`):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASSWORD=the16characterapppassword
   MAIL_FROM=yourname@gmail.com
   ```
4. Stop the backend (Ctrl+C) and start it again (`uvicorn app.main:app --reload`).
5. **Check:** on http://localhost:3000/register fill the form and press **Send verification code**. An email with a 6-digit code should arrive within a minute (look in Spam too). Type it in and press **Create account**.

If nothing arrives, look in the backend terminal for `Could not send email`. The usual causes are a wrong app password or typing spaces in `.env`. Only port 587 is supported.

Other free options: Brevo (host `smtp-relay.brevo.com`, port 587, your Brevo login and an SMTP key) or Resend (needs a domain you own).

## Step 4. Click-through check (about 30 minutes, web and phone)

Do this once on the **web at laptop width**, once on the web **narrowed to phone width** (press F12, then the phone icon), and once in the **Expo Go app**. Tick each line.

1. Register: name, email, password (8+ characters with a number), tick the privacy box, **Send verification code**, enter the emailed code, **Create account**. You land on the profile steps.
2. Try a wrong code: it must be refused. Ask for a new code twice within a minute: it must say to wait.
3. Log out, then log in with email + password. Try a wrong password: it must be refused.
4. **Forgot password:** request the code, enter it with a new password, then log in with the new password.
5. Profile step 1: tap an education tile (they must look selected). Step 2: search a skill and pick a few. Step 3: choose a city and "how far", then the industries.
6. Press **Review my profile**, then see the **recommendations**. Check the pictures, tile sizes and that text is not cut off, in English and then in Hindi, Marathi and Bengali (language switcher).
7. **Read aloud:** on every screen press **Read this page** (web) or the **Read aloud** button (phone). It must speak only after you press it.
8. **Account page:** try **Download my data**, then **Delete my account** using **Email me a code instead**.
9. **Admin:** log in with the admin account on the web and open `/admin`.

Take a screenshot of anything ugly, cut off, or broken, and note which step.

## Step 5. Voice on a phone (optional, about 60 minutes)

- **Read aloud** works in Expo Go and in web browsers. You only need the voices on the phone: Android Settings > search "Text-to-speech" > install Hindi, Marathi and Bengali voice data.
- **Microphone input on the web** works in Chrome and Edge (not in every other browser). The mic button simply does not appear if the browser cannot do it.
- **Microphone input on the phone app** does **not** work in Expo Go (the button hides itself). It needs a development build:
  1. Make a free account at https://expo.dev, then in `mobile` run: `npm install -g eas-cli`, `eas login`, `eas build:configure`.
  2. Run `eas build --profile development --platform android` (it builds in the cloud and takes 15-30 minutes).
  3. Download and install the `.apk` it gives you on your phone.
  4. Run `npx expo start --dev-client` and open the app you installed. The 🎤 button now appears next to search and typing boxes. Allow the microphone permission when asked.
- If you skip this step, say so in your report: voice input on the phone app is built but not tested.

## Step 6. Lighthouse audit (web, about 20 minutes)

1. Stop `npm run dev`. In `web` run `npm run build` and then `npm start`, so you test the real production build.
2. Open http://localhost:3000 in **Chrome**, press **F12**, open the **Lighthouse** tab.
3. Choose **Mobile**, tick **Performance**, **Accessibility** and **Best practices**, press **Analyze page load**.
4. Repeat on: login page, register page, and (after logging in) the skills page and the recommendations page.
5. Save a screenshot of each score and the **Failed audits / Accessibility issues** list.

## Step 7. TalkBack check (Android, about 20 minutes)

1. On the phone: Settings > Accessibility > **TalkBack** > turn on. (Volume keys held together for 3 seconds also toggle it.)
2. Open the app. Swipe right to move to the next item, double-tap to press.
3. Go through login, register, the three profile steps and the recommendations.
4. Note anything that is skipped, read as just "button" with no name, read in a strange order, or that you cannot press.
5. Turn TalkBack off when finished.

## Step 8. Language review (about 20 minutes of a friend's time)

Hindi (first check by a native speaker was done earlier), Marathi and Bengali text is machine-translated. Ask one friend per language to open the app in that language and skim about 20 screens. Ask them to note awkward, wrong or too formal words. Send me the list (screen name, wrong text, better text) and I will update the files.

## Step 9. Test with 2-3 real users (about 15 minutes each)

Pick people aged 18-25 who are not developers. Give them a phone and say only: "Find an internship for yourself." Do not help for the first 30 seconds of being stuck. Write down for each person: time to reach their first result, where they hesitated or tapped the wrong thing, words they did not understand, and anything they said out loud.

## Step 10. Send me the results (about 10 minutes)

Send in one message: test results of Step 1 (pass/fail), your click-through notes and screenshots (Step 4), Lighthouse scores (Step 6), TalkBack notes (Step 7), the language lists (Step 8) and the user-test notes (Step 9). Say which steps you skipped. I will fix what you found, in this order: broken things first, then confusing things, then looks.

## Step 11. Put it online (when everything above works)

Follow `DEPLOYMENT.md` (Render for the backend and website). Two things are easy to forget: set the **SMTP settings** there as well (without them nobody can register), and keep **one** backend instance because the code limiter is kept in memory.

---

## What to write in your project report (limitations)

- Hindi, Marathi and Bengali text is machine-translated; only Hindi was checked by a native speaker.
- Matching scores show how well a profile fits an internship; they are not a chance of being selected. The listings are demo data, not the real PMIS list; people must apply on the official PMIS portal.
- Email codes need an email service; the code limiter and used-code list are in memory (one server only).
- Voice depends on the browser or phone; mobile voice input needs a development build.
- Accessibility and speed audits (Steps 6 and 7) results: add yours.
