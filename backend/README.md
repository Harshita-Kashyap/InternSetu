# InternSetu Backend (FastAPI)

Batch 1: foundation, authentication, consent/privacy, admin seeding.
Batch 2: taxonomy, internship and profile tables, dataset loader, taxonomy API, text-to-taxonomy matching.
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
- `internsetu_taxonomy.json`, `internsetu_synthetic_internships_v1.json`, `internsetu_synthetic_candidates_v1.json` — your files, unchanged.
- `locations_coordinates.csv` — approximate latitude/longitude of the 70 cities (needed for the distance score). Please spot-check.
- `translations_template.csv` — 623 rows (id, type, name_en, **hi**, **mr** blank). Fill `hi` and `mr`, save as `data/translations.csv`, then run the load command again.
  Anything left blank falls back to English.

## Taxonomy endpoints (added)
| Method & path | Auth | Purpose |
|---|---|---|
| GET `/taxonomy/{type}?lang=hi&q=pyth&parent=LOC-STATE-MP&limit=100` | – | Options for dropdowns/chips/search. Types: `education_level degree field_of_study skill_category skill sector role_domain role interest state city`. |
| POST `/taxonomy/normalize` | Bearer | Body `{entry_type, text}` for "other skill" boxes. Returns the matched entry, or flags the text for admin review (with a suggestion if one is close). |
| GET `/taxonomy/types` | – | List of types. |

## Notes
- Mobile numbers are stored as 10 digits (`+91`/`0` prefixes are accepted and removed).
- The old public `POST /users` route was removed: it created accounts with no password.
- Login lockout is in-memory (fine for one server process).
- Folder layout: `app/api` routes · `app/core` config/security · `app/models` DB tables ·
  `app/schemas` request/response shapes · `app/services` business logic ·
  `app/services/recommendation` (engine, next step).
