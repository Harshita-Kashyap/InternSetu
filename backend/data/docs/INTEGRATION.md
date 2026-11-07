# Testing the backend and connecting the web and mobile apps

## 1. Test the backend (about 10 minutes)

Run everything from the `backend/` folder with the virtual environment active.

**A. One-time setup** (skip what you already did)
1. Postgres running, database `internsetu` created, `.env` filled (`DATABASE_URL`, `SECRET_KEY`).
2. `pip install -r requirements.txt`
3. `alembic upgrade head`
4. `python -m app.scripts.load_datasets --all`
5. Optional admin: `python -m app.scripts.create_admin --name "You" --email you@example.com`

**B. Automatic tests**
```
pytest
```
No Postgres needed (uses a temporary in-memory database). Expect every test to pass. If something fails, copy the
failing test name and the last lines of the output.

**C. Smoke test against the running server** (uses your real Postgres)
```
uvicorn app.main:app --reload          # terminal 1
python -m app.scripts.smoke_test       # terminal 2
```
It prints PASS/FAIL for: health, register, taxonomy search, save profile, confirm, recommendations, detail, save
internship, delete account. It creates and deletes its own test user.

**D. Click through it by hand:** open http://localhost:8000/docs
1. `POST /api/v1/auth/register` -> Try it out -> body
   `{"full_name":"Asha","email":"asha@example.com","password":"Secret123","consent":true}` -> Execute.
2. Copy `access_token` from the answer. Press **Authorize** (top right) and paste it.
3. `PATCH /api/v1/me/profile` with, for example
   `{"education_level_id":"EDU-UG","home_location_id":"LOC-CITY-IND","skill_ids":["SK-PROG-001","SK-PROG-002"],"duration_preference":"2 months"}`
4. `POST /api/v1/me/profile/confirm`
5. `GET /api/v1/me/recommendations` (try `k=3`, `method=tfidf`).
   A profile that gets nothing back returns `nearest` instead (closest internships and what is missing).
6. Ids for dropdowns come from `GET /api/v1/taxonomy/skill?q=py`, `/taxonomy/city?q=indore`, `/taxonomy/education_level`.

Useful health URL: http://localhost:8000/health (shows `database: ok`).

## 2. Connect the apps

The API client is ONE file: `docs/api-client.ts`. Copy it into each app. It already contains the types, the token handling,
the error format and every endpoint.

### Web (Next.js)
1. `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. Copy `api-client.ts` to `app/lib/api.ts` and create the client once:
   ```ts
   const storage = { get: () => localStorage.getItem("t"), set: (t: string | null) => t ? localStorage.setItem("t", t) : localStorage.removeItem("t") };
   export const api = createApi({ baseUrl: process.env.NEXT_PUBLIC_API_URL!, storage, onUnauthorized: () => (window.location.href = "/") });
   ```
3. CORS: the backend already allows `http://localhost:3000`. For another address add it to `CORS_ORIGINS` in `.env` and restart.
4. Replace in this order (test each before the next):
   login -> register -> consent -> onboarding steps -> summary -> recommendations -> detail -> saved.
5. Delete the demo scoring in `app/lib/store.ts` / `data.ts`; the backend does all scoring now.

### Mobile (Expo / React Native)
1. `.env`: `EXPO_PUBLIC_API_URL=...` where the address depends on where the app runs:
   | Where the app runs | Address |
   |---|---|
   | Android emulator | `http://10.0.2.2:8000` |
   | iOS simulator | `http://localhost:8000` |
   | Real phone (same Wi-Fi) | `http://<your PC's IP>:8000`, and start the server with `uvicorn app.main:app --host 0.0.0.0 --reload`; allow port 8000 in the Windows firewall |
2. Add `http://<that address>:8000` style origins to `CORS_ORIGINS` only if you also run the app in a browser (native apps ignore CORS).
3. Copy `api-client.ts` to `src/api.ts` and store the token in secure storage:
   ```ts
   import * as SecureStore from "expo-secure-store";
   const storage = { get: () => SecureStore.getItemAsync("t"), set: (t: string | null) => t ? SecureStore.setItemAsync("t", t) : SecureStore.deleteItemAsync("t") };
   export const api = createApi({ baseUrl: process.env.EXPO_PUBLIC_API_URL!, storage, onUnauthorized: () => navigationRef.reset({ index: 0, routes: [{ name: "Login" }] }) });
   ```
4. Same screen order as web. Use `Linking.openURL(item.apply_url)` for the Apply button.

### Which screen calls what
| Screen | Calls |
|---|---|
| Language choice, Splash, Help | none (local) |
| Register | `api.auth.register({... consent: true})` |
| Login | `api.auth.login(emailOrMobile, password)` |
| Consent / privacy | register already records consent; Settings uses `api.consent.*` |
| Onboarding 1 Education | `api.taxonomy.list("education_level")`, `("degree")`, `("field_of_study")`, then `api.profile.save({...})` |
| Onboarding 2 Skills & interests | `api.taxonomy.list("skill", {q})`, `("interest")`, `("role")`, `("sector")`, "other skill" -> `api.taxonomy.normalize`, then `api.profile.save` |
| Onboarding 3 Preferences | `api.taxonomy.list("city", {q})`, `api.taxonomy.durations()`, then `api.profile.save` |
| Profile summary | `api.profile.get()`, button -> `api.profile.confirm()` |
| Recommendations | `api.recommendations.list()`; if `count === 0` show `nearest` |
| Internship detail | `api.recommendations.detail(id)` |
| Skill gap | `recommendations.skill_gap_summary` or `api.recommendations.skillGap()` |
| Saved | `api.saved.list/save/remove` |
| Settings | `api.auth.changePassword`, `api.consent.withdraw`, `api.account.export`, `api.account.delete`, `api.auth.setLanguage` |

### Error handling (same on both)
Every failure is an `ApiError` with a stable `code`. Show your own translated text for the code and put `fields` next to inputs:
`invalid_credentials`, `account_exists`, `too_many_attempts`, `validation_error` (use `e.fieldMessage("password")`),
`token_expired` (client logs out by itself), `consent_required`, `profile_incomplete` (send user to onboarding),
`engine_unavailable`, `network_error`.

## 3. Multiple languages (UI only, backend stays English)

* The backend returns English text plus a stable `id` for every skill, city, sector, role, etc.
* Each app keeps its own language files, for example `locales/en.json`, `hi.json`, `mr.json` for screen text.
* For taxonomy names, run `python -m app.scripts.export_ui_taxonomy`. It writes `data/ui_taxonomy_en.json`
  (`{"skill": {"SK-PROG-001": "Python", ...}}`). Copy it to `ui_taxonomy_hi.json` / `ui_taxonomy_mr.json`, translate the values,
  and look names up by id: `hi.skill[item.id] ?? item.name` (falls back to English).
* Screen text libraries: web `next-intl` or `react-i18next`; mobile `i18next` + `expo-localization`.
* The explanation sentences (`why_recommended`, `considerations`) are English from the engine. Translate the labels around them;
  translating the sentences themselves would need reason codes from the engine (a possible later step).
* Save the choice with `api.auth.setLanguage("hi")` so both apps show the same language after login.

## 4. Common problems
| Problem | Fix |
|---|---|
| Browser console: CORS error | Add the web address to `CORS_ORIGINS`, restart the server |
| Phone cannot reach the server | Use the PC's IP (not `localhost`), start with `--host 0.0.0.0`, allow the firewall |
| `409 profile_incomplete` | Save the three required parts (education level, home city, at least one skill), then `confirm` |
| `403 consent_required` | The user withdrew consent: call `api.consent.give()` |
| `503 data_not_loaded` | Run `python -m app.scripts.load_datasets --all`, restart the server |
| Changed internships in the database but results did not change | The engine is built once per server start: restart the server |
| First `hybrid`/`semantic` request is slow or fails | Needs `pip install -r requirements-ml.txt` and internet once; the default `baseline` needs neither |
