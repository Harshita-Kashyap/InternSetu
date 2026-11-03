# InternSetu Web (Next.js 15, React 19, next-intl: en / hi / mr)

## Run
1. Start the backend first (see `backend/README.md`: database, `alembic upgrade head`, `load_datasets --all`).
2. `npm install`, copy `.env.example` to `.env.local` (`NEXT_PUBLIC_API_URL` = backend URL, no `/api/v1`).
3. `npm run dev` -> http://localhost:3000 (redirects to `/en`). The backend `CORS_ORIGINS` must include this origin.

## Pages (`app/[locale]/`)
`/` login · `/register` · `/forgot-password` · `/consent` · `/privacy` · `/profile` (education) -> `/profile/skills` ->
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
