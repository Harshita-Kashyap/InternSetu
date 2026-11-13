# InternSetu Web (Next.js 15, React 19, next-intl: en / hi / mr)

## Run
1. Start the backend first (see `backend/README.md`: database, `alembic upgrade head`, `load_datasets --all`).
2. `npm install`, copy `.env.example` to `.env.local` (`NEXT_PUBLIC_API_URL` = backend URL, no `/api/v1`).
3. `npm run dev` -> http://localhost:3000 (redirects to `/en`). The backend `CORS_ORIGINS` must include this origin.

## Pages (`app/[locale]/`)
`/` login · `/register` (with emailed code) · `/forgot-password` · `/consent` · `/privacy` · `/profile` (education) -> `/profile/skills` ->
`/profile/preferences` (home city, nearby / selected cities / anywhere, domains) -> `/profile-summary` (confirm) ·
`/home` discovery (All / Suitable for me, search, sector + city filters, Check match) · `/recommendations` (top 3-5 eligible) ·
`/saved` · `/admin`.
After login a confirmed profile goes to `/home`; a draft profile goes to `/profile`. "Edit profile" is in the header.

## Code map
`app/components/` Header, AuthShell, ThemeToggle, ChipPicker, MatchModal, Ring, Stepper, Toast, LanguageSwitcher ·
`app/lib/` `api.ts` (backend client), `store.ts` (profile names<->ids), `taxo.ts` (taxonomy cache) ·
`i18n/` + `messages/` translations (`tr("English text")`; missing keys fall back to English) · `app/globals.css` design tokens, light/dark theme.

## Admin
URL: `/en/admin` (link "Administrator sign-in" on the login page; admins are also sent there after normal login).
Admins are never created by sign-up. Create one on the backend: `python -m app.scripts.create_admin --name "Name" --email you@example.com`
(password is typed at the prompt). Access is enforced by the backend (`/api/v1/admin/*` returns 401/403 for non-admins); the page only reflects that.

## Notes
- Data is synthetic; the UI labels it as demo data and "Apply" opens the official PMIS portal.
- Academic percentage/CGPA is intentionally not collected: no internship rule or scoring weight uses it.
- Work-mode (remote/on-site) is not offered: internships carry no work-mode field.

## Tests
`npm install` then `npm test` (Vitest + Testing Library, jsdom). Covers the ID/"Other" mapping, SelectOther, MultiSelect,
translation coverage (every `tr("...")` has en/hi/mr keys; bn has every en key) and locale-aware navigation. Backend: `pytest` in `backend/`.

## Profile "Other" values
A degree, field or city not in the taxonomy is saved on the server as free text (`degree_other`, `field_of_study_other`,
`home_location_other`; run `alembic upgrade head`). The matching engine still uses IDs only; a typed city earns no home-city
credit but never blocks eligibility or recommendations.

## Changes in this version
- Recommendations page shows a "Close match" tag for internships that are 1-2 skills away and a "Learn one skill, unlock more internships" panel.
- Interests are now optional (step 2 and summary); hint text explains they only help find similar work.
- Removed stale duplicate `api.ts`, `store.ts`, `taxo.ts` from the web root and the committed `.env.local` / `tsbuildinfo` (copy `.env.example`).

## Still open
Voice input on every text box (done for search and typing boxes), art on screens not yet illustrated (consent, pmis-check, profile-summary), full WCAG 2.2 AA device audit, more languages (te, ta, gu; Bengali done but unreviewed), registration without a password. Done since: **Read this page** button on every screen (`ReadPage`), microphone button `MicButton` (browser speech recognition), illustrations on register / forgot-password / account, sign-up with emailed code (session 14), illustrated icon-led setup screens (session 13), Read aloud on result cards, static-file service worker (`public/sw.js`), sign-up without a password (session 12), PMIS pre-check, activity skills picker, offline cache, Bengali (session 10), email-code login and deletion (session 11). Tests (60 Vitest + `next build`) cover mapping, i18n and components; add e2e tests.
