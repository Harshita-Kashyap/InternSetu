# InternSetu

**An eligibility-aware, explainable, multilingual internship recommender for the PM Internship Scheme (PMIS).**

B.Tech Major Project · SVIIT, Indore, Madhya Pradesh, India

InternSetu sits alongside the official PM Internship Scheme portal. It helps young people, especially first-time and low-skill applicants from small towns, answer three questions in their own language:

1. **Can I apply to PMIS?** (a quick, private self-check)
2. **Which internships fit me, and why?** (eligibility-first, scored out of 100, explained in plain words)
3. **What one skill should I learn next to unlock more internships?** (with free course links)

Applications are always completed on the official PMIS portal. InternSetu never applies on a user's behalf and never stores Aadhaar.

> **Demo data only.** All candidates and internships in this release are synthetic. They are labelled **Demo data** in every app and language and are not official PMIS vacancies.
>
> Items in `[square brackets]` are placeholders to fill in before submission (team names, final numbers, links).

---

## Table of Contents

- [Features](#features)
- [How It Works (User Journey)](#how-it-works-user-journey)
- [Architecture](#architecture)
- [Recommendation Method](#recommendation-method)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Admin Console](#admin-console)
- [API Overview](#api-overview)
- [Testing and CI](#testing-and-ci)
- [Evaluation](#evaluation)
- [Accessibility and Low-Bandwidth Support](#accessibility-and-low-bandwidth-support)
- [Privacy and Security](#privacy-and-security)
- [Deployment](#deployment)
- [Limitations and Future Work](#limitations-and-future-work)
- [Team](#team)
- [License](#license)

---

## Features

### For candidates

- **PMIS pre-check:** five yes/no questions (age 18–25, family income up to ₹12 lakh, government job, apprenticeship, and more). Stateless, nothing is stored, answers are a hint only, with a link to the official rules.
- **Sign-up and sign-in:** sign-up needs a name, a real email, a password and a **6-digit code emailed to that address** (this proves the email is yours). Log in with email (or mobile) + password. If you forget the password, request a code on your email and set a new one. SMS is not used (not free).
- **Simple profile in 3 steps:** education, skills, and preferences (industries and location).
- **"What have you done?" skills picker:** icon tiles (farming, shop work, tailoring and 26 more) that add the matching skills automatically. Search works in Hindi, Marathi and Hinglish.
- **Always 3–5 results, in tiers:**
  - **Eligible:** education and mandatory skills are met.
  - **Close match:** education is met, 1–2 skills are missing.
  - **Starter:** a cold-start pick when a profile is thin.
- **Your industries count:** each chosen industry (up to 3) gets a slot when anything exists in it, plus an **Only my industries** toggle.
- **Explainable score (0–100):** at most 3 reasons and 1 "how to improve" tip, in plain language.
- **Learn one skill, unlock N internships:** shows the single skills that would unlock the most extra internships, each with free course links.
- **Distance and facilities:** "N km away" on every result, a gentle note when few options are nearby, and filters for food, stay, transport and travel allowance.
- **Discover and Saved:** browse, search and filter all internships, save favourites, and check your match for any listing.
- **Hand-off to PMIS:** the Apply button opens the official portal, with a "Documents to keep ready" checklist beside it.
- **Multilingual:** English, Hindi, Marathi and **Bengali** (web, mobile and server). Bengali is machine-translated and still needs review by a native speaker; Telugu, Tamil and Gujarati are planned. Adding a language is described in `docs/ADDING_A_LANGUAGE.md`.
- **Voice:** a **Read this page / Read aloud** button on every screen and on every result card (only speaks when tapped), and a **microphone button** next to search and typing boxes (skills, degree, field, college, internship search) so people can speak instead of type. English, Hindi, Marathi and Bengali, where the device or browser has the voices. Mobile voice input needs a development build (not Expo Go).
- **Skills as umbrella cards:** each skill category is a rectangle with an icon, a selected count and its related skills inside as chips (see `DESIGN_SYSTEM.md`).
- **Illustrated, icon-led UI:** a 3D-style, gently animated illustration at the top of each setup step, big icon tiles with text labels for education level and location choices, short sentences at about Grade-6 reading level, and a Read aloud button that speaks only when tapped. Layout is responsive (side by side on laptop, stacked on phone). Long lists (skills, cities, domains) stay as chips.
- **Light and dark themes** on web and mobile.

### For admins

- Edit scoring weights (must total 100%), with versioned weights.
- Manage the taxonomy and review flagged free-text values.
- Import internships from CSV with strict validation (size, row count, duplicates, mandatory-skill cap, duration, stipend, URL).
- Activate or deactivate internships.
- View statistics, evaluation information and an **audit log** of admin actions.

---

## How It Works (User Journey)

```text
Choose language
      │
      ▼
PMIS pre-check (optional, no login, nothing stored)
      │
      ▼
Sign up (name, email, password + emailed code)  ──►  Consent (local-language privacy notice)
      │
      ▼
Profile in 3 steps:  Education → Skills ("What have you done?") → Preferences
      │
      ▼
Recommendation engine:  eligibility → score → tiers → rank → explain
      │
      ▼
Top matches (3–5)  ·  Learn-one-skill panel  ·  Discover  ·  Saved
      │
      ▼
Apply on the official PMIS portal (with a documents checklist)
```

---

## Architecture

```text
 Web (Next.js, PWA) ─┐
                     ├── REST API (/api/v1, JSON, Bearer JWT) ──► FastAPI
 Mobile (Expo) ──────┘                                              │
                                                                    ├── Recommendation engine
                                                                    │   eligibility → score → tiers
                                                                    │   → rank → explain (reason codes)
                                                                    ▼
                                                               PostgreSQL
```

The web and mobile apps share one API contract, so a profile completed in one app is available in the other.

---

## Recommendation Method

### 1. Eligibility gate (hard rule)

A candidate is eligible for an internship only if the **education level** requirement is met and all **mandatory skills** (at most 2 per listing) are present. Location, stipend and preferred skills never make someone ineligible.

### 2. Match score (0–100)

| Component | Weight |
|---|---:|
| Skills | 35 |
| Education | 20 |
| Location | 20 |
| Industry (chosen sectors) | 25 |
| Role | 0 (not asked in the app; kept so it can be switched on later) |
| Stipend / duration | 0 (shown only) |

PMIS uses a fixed stipend and fixed 6/9-month durations, so they are shown as information and not scored. Admins can edit the weights, which must total 100%.

### 3. Tiers (so nobody gets an empty list)

1. **Eligible** internships, best first.
2. **Close match:** education met, 1–2 mandatory skills missing.
3. **Starter:** if fewer than 3 options exist, education-fit internships with more missing skills are added. Education is never relaxed.

Each chosen industry gets a guaranteed slot when anything exists in it.

### 4. Explanations from reason codes

Every explanation sentence is a **reason code plus parameters** (`backend/app/engine/explanation/reasons.py`). The API returns the codes and ready-made sentences in each supported language. Output is capped at 3 reasons and 1 improvement tip.

### 5. Learn one skill

For each missing skill, the engine counts how many extra internships it would unlock and returns the top few with free course links (SWAYAM, NPTEL, Skill India).

### Context flags

Flags such as `remote_district`, `first_generation` and `low_english` exist in synthetic candidates **for fairness evaluation only**. They are never used in scoring.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Web application | Next.js 15 (PWA) |
| Mobile application | Expo / React Native |
| Backend API | FastAPI |
| Database | PostgreSQL |
| ORM and migrations | SQLAlchemy, Alembic |
| Recommendation engine | Python; exact matching + TF-IDF, with optional hybrid semantic scoring |
| Voice | Web Speech API (web), native text-to-speech (mobile) |
| API documentation | Swagger / OpenAPI |
| Testing | pytest, Vitest, Jest, axe (accessibility) |
| Hosting | Render (API), Vercel (web), Neon (PostgreSQL) |

---

## Repository Structure

```text
InternSetu/
├── backend/                    FastAPI service, engine, migrations, data, tests
│   ├── app/
│   │   ├── api/routes/         auth, me, profile, recommendations, pmis, taxonomy, admin, health
│   │   ├── core/               config, database, security, rate limit, errors, validators
│   │   ├── models/             database tables
│   │   ├── schemas/            request / response shapes
│   │   ├── services/           recommendations, PMIS rules, localization, admin, courses, consent
│   │   ├── engine/
│   │   │   ├── eligibility/    hard gate
│   │   │   ├── matching/       score components
│   │   │   ├── ranking/        ordering
│   │   │   ├── explanation/    reason codes and text
│   │   │   ├── semantic/       TF-IDF / hybrid scorers
│   │   │   ├── tiers.py        eligible / close match / starter selection
│   │   │   └── geo.py          distance calculation
│   │   └── scripts/            load_datasets, build_dataset_v2, audit_dataset,
│   │                           evaluate_engine, build_activity_map, create_admin, smoke_test
│   ├── alembic/                database migrations
│   ├── data/                   datasets (v2 default), taxonomy, PMIS rules,
│   │                           activity map, evaluation notes
│   └── tests/                  backend test suite
├── web/                        Next.js app
│   ├── app/[locale]/           pages: home, register, profile, recommendations, saved,
│   │                           pmis-check, consent, privacy, admin
│   ├── app/components/         shared UI (MatchModal, ApplyHelp, Stepper, ...)
│   ├── app/lib/                API client, state store
│   ├── messages/               translations (en, hi, mr, ...)
│   └── tests/                  Vitest tests
├── mobile/                     Expo React Native app
│   ├── src/screens/            same flows as web
│   ├── src/components/         JobCard, MatchSheet, FilterSheet, ...
│   └── src/                    api, store, theme, i18n
├── .github/workflows/          CI: tests + dataset audit
├── WORK_LOG.md                 session-by-session history
├── CHANGE_TRACKER.md           change list and progress tracker
├── DEPLOYMENT.md               deployment guide
├── docker-compose.yml          local PostgreSQL
└── render.yaml                 Render blueprint for the API
```

---

## Getting Started

### Prerequisites

- Git
- Python 3.11–3.13
- Node.js 20+ and npm
- Docker Desktop (for local PostgreSQL), or an existing PostgreSQL 14+
- Expo Go on a phone, or an Android emulator / iOS simulator

### 1. Clone

```bash
git clone [repository-url]
cd InternSetu
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit DATABASE_URL, SECRET_KEY, CORS_ORIGINS
```

### 4. Migrate and load data

```bash
alembic upgrade head
python -m app.scripts.load_datasets --all          # v2 dataset (default)
# python -m app.scripts.load_datasets --all --dataset v1   # old dataset
python -m app.scripts.create_admin
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`, with Swagger docs at `/docs`.

### 5. Start the web app

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

### 6. Start the mobile app

```bash
cd mobile
cp .env.example .env
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go. On a physical phone, set the API URL in `.env` to your computer's LAN address, not `localhost`.

### Optional: semantic matching

```bash
pip install -r requirements-ml.txt
# then set MATCHING_METHOD=hybrid in backend/.env
```

The default is `baseline`, which is light enough for small free hosting plans.

---

## Admin Console

Create an admin with `python -m app.scripts.create_admin`, then sign in on the web app and open `/admin`. Admin permissions are enforced by the backend, not only by hiding pages.

From the console you can edit scoring weights, manage the taxonomy, import internships by CSV, activate or deactivate listings, view statistics and review the audit log.

---

## API Overview

Base path: `/api/v1`. Full interactive docs at `/docs`; the generated spec is `backend/openapi.json`.

| Area | Example endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register-code` (email a sign-up code), `POST /auth/register` (needs the code), password login, password reset by emailed code, current user |
| Profile | `GET/PUT /me/profile` |
| Recommendations | `GET /me/recommendations` (supports `only_my_sectors`, `close_matches`) |
| Discover | `GET /me/internships` (search, sector, city, `facilities`) |
| PMIS | `GET /pmis/rules`, `POST /pmis/precheck`, `GET /pmis/handoff` |
| Taxonomy | `GET /taxonomy/...`, `GET /taxonomy/activities` |
| Saved | save, list and remove saved internships |
| Consent and data | consent record and withdraw, data export, account deletion (Account page on web and mobile; confirm with the password **or an emailed code** via `POST /me/delete-code`) |
| Admin | weights, taxonomy, CSV import, listings, statistics, audit log |

Recommendation items include `score`, `tier`, `tier_label`, `why_codes`, `consider_codes`, `distance_km`, `skill_unlocks` and ready-made sentences in the requested language.

---

## Testing and CI

```bash
# Backend
cd backend && pytest

# Web
cd web && npx tsc --noEmit && npx vitest run

# Mobile
cd mobile && npx tsc --noEmit && npx jest

# Dataset audit (exits with code 1 on failure)
cd backend && python -m app.scripts.audit_dataset --dataset v2
```

Test coverage includes eligibility and tiers, PMIS rules, reason codes in all languages, location logic, dataset validation, sector recall, cold start, weight-change regression, an end-to-end register-to-results flow, accessibility checks (axe) and a load test with a 3-second response target.

GitHub Actions runs all suites and the dataset audit on every push.

Last recorded baseline (session 29): backend 199 passed; web `tsc` clean, 60 Vitest passed and `next build` OK; mobile `tsc` clean and 50 Jest passed.

---

## Evaluation

Evaluation uses the v2 synthetic candidates and `[300–500]` human-labelled pairs.

| Metric | Result |
|---|---|
| Precision@5 | `[value]` |
| NDCG@5 | `[value]` |
| Candidates with 3 or more results | `[value]` |
| Eligible result for sparse profiles | `[value]` |
| Eligible result for general graduates | `[value]` |

```bash
python -m app.scripts.evaluate_engine fairness
python -m app.scripts.evaluate_engine sensitivity
```

- **Fairness:** compares results across remote-district, first-generation, low-English, sparse and graduate groups. Context flags are never used in scoring.
- **Sensitivity:** shows how results change when each weight changes. Skills and location weights matter most.
- **Pilot:** `[10–20]` real users from the target groups measured time to first useful result and whether the reasons were understood. Findings: `[summary]`.

Notes are in `backend/data/docs/EVALUATION_NOTES.md`.

---

## Accessibility and Low-Bandwidth Support

- WCAG 2.2 AA pass: aria labels, sufficient contrast, 16px minimum text, 44px touch targets, keyboard use, and TalkBack / VoiceOver checks.
- Read-aloud on every screen and voice input for skills.
- Last recommendations are cached and shown when offline.
- Requests retry automatically with clear offline messages.
- Compressed images and an installable PWA.

---

## Privacy and Security

- **Data minimisation:** only what is needed is collected. Family income and family-job answers are treated as sensitive. The PMIS pre-check stores nothing. Aadhaar is never collected.
- **DPDP alignment:** local-language privacy notice, recorded and withdrawable consent, data export, account deletion and a defined retention period (`[X months]`).
- **Authentication:** hashed passwords; emailed one-time codes for login, password reset and account deletion (6 digits, expire in 5–10 minutes, single use, 5 wrong tries lock for 15 minutes, nothing stored in the database).
- **Abuse protection:** persistent login lockout and rate limiting (Redis or database backed).
- **Authorization:** admin rights are enforced on the backend.
- **Operations:** error monitoring and an admin audit log.

---

## Deployment

| Part | Service |
|---|---|
| API | Render (`render.yaml`; free plan sleeps after about 15 minutes idle) |
| Database | Neon (free PostgreSQL) |
| Web | Vercel |
| Mobile | Expo build, or Expo Go for demos |

Set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` and `MATCHING_METHOD=baseline` on the API. Migrations run through Alembic. See `DEPLOYMENT.md` for step-by-step instructions.

---

## Limitations and Future Work

- All data is synthetic. Real PMIS vacancy data would need an official source or partnership.
- Town coordinates are approximate, so distances are straight-line estimates.
- Course links are curated per skill where available. Others fall back to search links.
- Only Hindi has been checked by a native speaker. Marathi and Bengali are machine-translated and need review, and tribal-language support needs community review.
- Emailed codes need SMTP settings to be sent; without them they are only printed in the server log (demo mode). The code limiter is in memory, so it suits one server only.
- PMIS rules (age, income, duration) can change. Always verify at pminternship.mca.gov.in.
- Future work: popular-by-state rankings from real usage, soft distance scoring, richer voice support, more regional languages and a larger pilot.

---

## Team

| Name | Role |
|---|---|
| `[Name]` | `[Role]` |
| `[Name]` | `[Role]` |
| `[Name]` | `[Role]` |

Guide: `[Faculty name]`, SVIIT, Indore

---

## License

`[Choose a license, e.g. MIT, or "Academic project, all rights reserved"]`
