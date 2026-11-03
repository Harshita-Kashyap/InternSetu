# InternSetu Mobile (Expo / React Native, TypeScript)

Same features, API and look as the web app: light + dark theme, en / hi / mr, discovery, Check match, profile editing.

## Run
1. Start the backend first (see `backend/README.md`: database, `alembic upgrade head`, `load_datasets --all`).
   For a physical phone start it with `uvicorn app.main:app --host 0.0.0.0 --reload`.
2. `npm install`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`
   (Android emulator `http://10.0.2.2:8000`, iOS simulator `http://localhost:8000`, phone `http://<PC-LAN-IP>:8000`).
3. `npx expo start` (press `a` for Android, or scan the QR in Expo Go). `npm run typecheck` checks types.

## Screens (`src/screens`)
Login, Register, ForgotPassword, Consent -> Profile (education) -> Skills -> Preferences (home city, nearby / selected cities /
anywhere, domains) -> Recommendations (top 3-5 eligible). Home = Discover (All / Suitable for me, search, sector + city filters,
Check match). Saved. After login a confirmed profile opens Home; a draft profile opens Profile. "Edit profile" is in the header.

## Code map
`App.tsx` fonts, session restore, navigation, theme · `src/api.ts` backend client (same contract as web) · `src/store.ts` profile names<->ids ·
`src/taxo.ts` taxonomy cache · `src/theme.ts` light/dark colours + ThemeProvider · `src/i18n.tsx` translations (`t("English text")`, English fallback) ·
`src/components/` Header, Button, Choice, TaxPicker, JobCard, MatchSheet, FilterSheet, Ring, Stepper, Toast, ThemeToggle, LanguageSwitcher ·
`assets/` logo, icons, hero.

## Notes
Data is synthetic and labelled as demo data; "Apply" opens the official PMIS portal. Admin features are web-only (`/en/admin`).
Academic percentages and work mode are not collected (not used by eligibility or scoring).
