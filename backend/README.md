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
5. `python -m app.scripts.load_datasets --all` - loads the v2 data: taxonomy, city coordinates, 2,500 internships, 700 candidates (add `--dataset v1` for the original 750/350 files; rebuild v2 with `python -m app.scripts.build_dataset_v2`, check with `python -m app.scripts.audit_dataset`)
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
| Auth | `POST /auth/register-code` + `POST /auth/register` (needs email, password and the emailed 6-digit code), `/auth/login`, `POST /auth/refresh` (sliding session), `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password` + `/auth/reset-password` (emailed code), `POST /me/delete-code` then `DELETE /me` with `{code}` or `{password}`. Without SMTP settings the email is printed in the server log. Codes: HMAC, 5-10 minutes, single use, 5 wrong tries lock 15 minutes |
| Account | `GET/POST/DELETE /me/consent`, `GET /me/export`, `DELETE /me`, `PATCH /me/settings` |
| Taxonomy | `GET /taxonomy/{type}`, `/taxonomy/durations`, `POST /taxonomy/normalize` |
| Profile | `GET/PATCH /me/profile`, `POST /me/profile/confirm` |
| Recommendations | `GET /me/recommendations?k=&method=&lang=&close_matches=true` (close matches = 1-2 mandatory skills missing; adds `tier`, `tier_label`, `skill_unlocks`, `close_count`), `/me/recommendations/{internship_id}`, `/me/skill-gap` |
| PMIS (public) | `GET /pmis/rules`, `POST /pmis/precheck` (stateless self-check; rules in `data/pmis_rules.json`, verify them on the official portal) |
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

## Engine behaviour (updated)
- Tiers (`app/engine/tiers.py`): `eligible` (all rules met) then `near` (education OK, 1-2 mandatory skills missing). Education is never relaxed. Up to 3 preferred sectors each get a slot when anything exists in them. `close_matches=false` restores the strict old behaviour.
- Default weights: skills 35, education 20, location 20, industry 25, role 0, preference 0 (role is not asked or scored; kept as a zero-weight key) (PMIS stipend/duration are fixed). Admins can still edit weights (must total 100).
- Measured on the synthetic data (structured scorer): every one of 350 candidates now gets at least 3 results (was: 55% had fewer than 3); sector slot guaranteed in 622/622 checkable cases.

## Still open (see ../WORK_LOG.md)
Interests are ignored by the default scorer; OTP limiter and used-code list are in memory (one server only); SMS dropped (not free), registering needs an email or a password (password optional with an email); in-memory login lockout; synthetic data is skewed and durations/stipends do not match PMIS; server text is available in English, Hindi, Marathi and Bengali (reasons, `localize.py`, PMIS, activity names, emails); Bengali/Marathi are unreviewed machine translations. 163 tests pass (session 12).


## Evaluation scripts
`python -m app.scripts.evaluate_engine fairness|sensitivity [--json out.json]` compares result quality across candidate groups and shows how much the top 5 moves when a scoring weight changes. Results: `data/docs/EVALUATION_NOTES.md`.

## Sessions and logging (session 29)
- **Sliding session:** the access token lasts 60 minutes. While the person keeps using the app, web and mobile call `POST /auth/refresh` once less than 20 minutes remain and get a fresh token. The token carries `ss` (when the login session started); once a session is older than `SESSION_MAX_DAYS` (default 14) it cannot be renewed and the person logs in again.
- **Request log:** every response has an `X-Request-ID` header (a good incoming one is kept). One INFO line per request: id, method, path, status, milliseconds (health checks at DEBUG; 5xx at WARNING). Query strings, bodies, tokens, emails and passwords are never logged. An unexpected crash is logged with its traceback and the person gets a JSON 500 that quotes the id. `LOG_LEVEL` sets the detail.
- **Admin audit log:** `GET /admin/audit` (see the admin Audit log tab on the web).
