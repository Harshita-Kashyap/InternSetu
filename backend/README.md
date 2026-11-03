# InternSetu Backend (FastAPI)

REST API for the InternSetu web and mobile apps: accounts and consent, taxonomy, candidate profiles, internship
recommendations (engine in `app/engine`), saved internships and an admin console.
All data is **synthetic**; "Apply" only links to the official PMIS portal (`PMIS_PORTAL_URL`).
Python 3.11-3.14. Run every command from this `backend/` folder.

## Start the backend (first time)
```
python -m venv .venv
.venv\Scripts\Activate.ps1                 # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt            # add: pip install -r requirements-ml.txt  only for hybrid/semantic
copy .env.example .env                     # then edit .env (see below)
```
1. Create an empty PostgreSQL database named `internsetu` (pgAdmin or `createdb internsetu`).
2. Edit `.env`: `DATABASE_URL` (your Postgres password) and `SECRET_KEY` (32+ chars:
   `python -c "import secrets; print(secrets.token_hex(32))"`). Optional: `MATCHING_METHOD`, `DEFAULT_K`, `CORS_ORIGINS`.
3. `python -m app.scripts.check_db` - optional, confirms the database connection.
4. `alembic upgrade head` - creates all tables.
5. `python -m app.scripts.load_datasets --all` - loads taxonomy, city coordinates, 750 internships, 350 candidates
   from `data/` (safe to re-run; **required**, otherwise there is nothing to recommend).
6. `python -m app.scripts.create_admin --name "Your Name" --email you@example.com` - admin account (asks for password).
7. `uvicorn app.main:app --reload` - API on http://localhost:8000, docs at `/docs`.

Next time only step 7 is needed (plus step 4 after pulling new migrations).
Web `.env.local` must point to this server, and `CORS_ORIGINS` must include the web origin.

## Tests
`pytest` - uses in-memory SQLite, no Postgres needed. Live check: `python -m app.scripts.smoke_test` (server running).

## API (all under `/api/v1`, JSON, `Authorization: Bearer <token>`)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `GET /auth/me`, `POST /auth/change-password`, forgot/reset (stubs, no email/SMS) |
| Account | `GET/POST/DELETE /me/consent`, `GET /me/export`, `DELETE /me`, `PATCH /me/settings` |
| Taxonomy | `GET /taxonomy/{type}`, `/taxonomy/durations`, `POST /taxonomy/normalize` |
| Profile | `GET/PATCH /me/profile`, `POST /me/profile/confirm` |
| Recommendations | `GET /me/recommendations`, `/me/recommendations/{internship_id}`, `/me/skill-gap` |
| Discovery | `GET /me/internships?scope=all|suitable&q=&sector=&city=&limit=&offset=` (eligibility + match % when profile is complete) |
| Saved | `GET /me/saved`, `PUT/DELETE /me/saved/{internship_id}` |
| Admin (role `admin`) | `/admin/ping`, `stats`, `weights` (must total 100%), `taxonomy`, `flagged`, `internships` (+ CSV `import`, activate/deactivate), `evaluation` |
| System | `GET /health` (no prefix) |

Errors: `{"error": {"code": "...", "message": "...", "fields": [{"field": "...", "message": "..."}]}}`.
Login locks for 15 min after 5 failures (in-memory, one server process). The backend is English-only; apps translate the UI.

## Folders
`app/api` routes - `app/core` config, DB, security, errors - `app/models` tables - `app/schemas` request/response shapes -
`app/services` business logic - `app/engine` recommendation engine - `app/scripts` command-line tools -
`alembic` migrations - `data` datasets - `tests` - `docs` (see below).

## Docs
- `docs/INTEGRATION.md` - testing and connecting web/mobile. `docs/api-client.ts` - typed client example.
- `docs/ENGINE_INTEGRATION_NOTES.md`, `docs/engine_README_from_teammate.md` - how the engine is plugged in and how it scores.

## Deployment
`docker compose up --build`, then `docker compose exec api python -m app.scripts.load_datasets --all`.
Put TLS in front (`Caddyfile`), use a long random `SECRET_KEY`, never commit `.env`.
Note: the Dockerfile creates tables with `create_all`; for production prefer `alembic upgrade head`.
`WARM_UP=0` disables the start-up model warm-up.
