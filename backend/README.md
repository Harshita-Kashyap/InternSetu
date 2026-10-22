# InternSetu Backend (FastAPI)

Batch 1: foundation, authentication, consent/privacy, admin seeding.
Batch 2: taxonomy, internship and profile tables, dataset loader, taxonomy API, text-to-taxonomy matching.
Batch 3: profile API, recommendation engine (teammate's code in `app/engine`), saved internships, API client for web and mobile.

**Start here: `docs/INTEGRATION.md`** (how to test the backend and connect the web and mobile apps).
Python 3.12 recommended. Run all commands from this `backend/` folder.

## First-time setup (Windows PowerShell; on Linux/macOS use `source .venv/bin/activate`)

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env
```
1. In pgAdmin create an empty database named `internsetu`.
2. Edit `.env`: put your Postgres password in `DATABASE_URL` and a secret in `SECRET_KEY`
   (`python -c "import secrets; print(secrets.token_hex(32))"`).
3. Create the tables:        `alembic upgrade head`
   Load the datasets:       `python -m app.scripts.load_datasets --all`  (safe to run again)
4. Create an admin account:  `python -m app.scripts.create_admin --name "Your Name" --email you@example.com`
5. Start the server:         `uvicorn app.main:app --reload`
6. Open http://localhost:8000/docs to try every endpoint.

## Run the tests (no Postgres needed, uses in-memory SQLite)
```
pytest
```

## API summary (all under `/api/v1`, JSON)

| Method & path | Auth | Purpose |
|---|---|---|
| POST `/auth/register` | – | Body: `full_name`, `email` and/or `mobile`, `password` (8+ chars, letter + number), `consent: true`, optional `preferred_language` (`en`/`hi`/`mr`). Returns token + user. |
| POST `/auth/login` | – | Body: `identifier` (email or mobile), `password`. Returns token + user. Locks for 15 min after 5 failures. |
| GET `/auth/me` | Bearer | Current user. |
| POST `/auth/change-password` | Bearer | `current_password`, `new_password`. |
| POST `/auth/forgot-password`, `/auth/reset-password` | – | Stubs (no email/SMS in release 1.0). |
| GET / POST / DELETE `/me/consent` | Bearer | View status / give / withdraw consent. |
| GET `/me/export` | Bearer | Download all my data. |
| DELETE `/me` | Bearer | Body `{"password": "..."}`. Deletes account and data. |
| GET `/admin/ping` | Admin | Confirms admin role. |
| GET `/health` (no prefix) | – | Server + database status. |

Send the token as `Authorization: Bearer <token>`.

**Errors** always look like
`{"error": {"code": "invalid_credentials", "message": "...", "fields": [{"field": "consent", "message": "..."}]}}`
(`fields` only appears for validation errors, so the UI can show each message next to its input).

## Datasets (`data/`)
- `internsetu_taxonomy.json`, `internsetu_synthetic_internships_v1.json`, `internsetu_synthetic_candidates_v1.json` - your files, unchanged.
- `locations_coordinates.csv` - approximate latitude/longitude of the 70 cities (please spot-check).
- `ui_taxonomy_en.json` - id -> English name for the apps' translation files (`python -m app.scripts.export_ui_taxonomy`).

## Endpoints (all under `/api/v1`; see http://localhost:8000/docs for the full list with examples)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `GET /auth/me`, `POST /auth/change-password`, forgot/reset (stubs) |
| Account | `GET/POST/DELETE /me/consent`, `GET /me/export`, `DELETE /me`, `PATCH /me/settings` (UI language) |
| Taxonomy | `GET /taxonomy/{type}?q=&parent=&limit=`, `GET /taxonomy/durations`, `POST /taxonomy/normalize` |
| Profile | `GET/PATCH /me/profile`, `POST /me/profile/confirm` |
| Recommendations | `GET /me/recommendations?k=&method=`, `GET /me/recommendations/{internship_id}`, `GET /me/skill-gap` |
| Saved | `GET /me/saved`, `PUT/DELETE /me/saved/{internship_id}` |
| Admin | `GET /admin/ping` (more in the next batch) |
| System | `GET /health` |

Settings in `.env`: `MATCHING_METHOD` (`baseline` default, `tfidf`, `hybrid`, `semantic`), `DEFAULT_K` (3 to 5), `PMIS_PORTAL_URL`.

## Notes
- The backend is English-only; the apps translate the UI (see `docs/INTEGRATION.md`, section 3).
- Mobile numbers are stored as 10 digits (`+91`/`0` prefixes are accepted and removed).
- The old public `POST /users` route was removed: it created accounts with no password.
- Login lockout is in-memory (fine for one server process).
- Folder layout: `app/api` routes · `app/core` config/security · `app/models` DB tables ·
  `app/schemas` request/response shapes · `app/services` business logic ·
  `app/services/recommendation` (engine, next step).
