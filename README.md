# InternSetu

**An eligibility-aware, explainable internship recommender for the PM Internship Scheme (PMIS).**

B.Tech Major Project · SVIIT, Indore, Madhya Pradesh, India

InternSetu is an AI-assisted internship recommendation system designed to sit alongside the official PM Internship Scheme (PMIS) portal. It filters out internships a candidate is not eligible to apply for, scores eligible internships out of 100 using transparent and configurable weights, and explains each recommendation in plain language—including skills the candidate could build next. Candidates complete their applications on the official PMIS portal.

> **Demo data only:** All candidates and internships in this release are synthetic. They are labelled **Demo data** in the applications and are not official PMIS vacancies.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure and Start PostgreSQL](#2-configure-and-start-postgresql)
  - [3. Set Up the Backend](#3-set-up-the-backend)
  - [4. Run Database Migrations and Load Data](#4-run-database-migrations-and-load-data)
  - [5. Start the Web App](#5-start-the-web-app)
  - [6. Start the Mobile App](#6-start-the-mobile-app)
- [Admin Access](#admin-access)
- [API Documentation](#api-documentation)
- [Testing and Verification](#testing-and-verification)
- [Recommendation Method](#recommendation-method)
- [Evaluation](#evaluation)
- [Troubleshooting](#troubleshooting)
- [Privacy and Security](#privacy-and-security)
- [Limitations and Future Work](#limitations-and-future-work)
- [Deployment Notes](#deployment-notes)
- [Git Workflow](#git-workflow)
- [Team](#team)
- [License](#license)

## Features

### Candidate experience

- **Hard eligibility gate:** Education level and mandatory skills determine eligibility. Location and preferred skills never make a candidate ineligible.
- **Explainable match score (0–100):** Six weighted factors contribute to the score: skills (30), education (25), location (20), sector (15), role (5), and preferences (5). Admins can edit the weights, which must total 100%.
- **Check Match:** Displays eligibility separately from match score, so a failed mandatory requirement is not confused with a low score.
- **Internship discovery:** Browse all internships or those suitable for the candidate, search, and filter by sector and city.
- **Top matches:** Shows the 3–5 best eligible internships with explanations and skill-gap suggestions. If no internship is eligible, the system shows the nearest alternatives and the mandatory skills still missing.
- **Flexible location preference:** Choose nearby opportunities, selected cities, or anywhere in India.
- **Profile management:** Three-step profile setup; profiles can be edited at any time. Completed profiles skip setup on the next login.
- **Saved internships:** Save or remove internships, check matches, and avoid duplicate saved entries.
- **Language and theme support:** English, Hindi, and Marathi; light and dark themes on web and mobile.

### Admin console

- Edit recommendation scoring weights.
- Manage taxonomy and review flagged free-text values.
- Import internship data from CSV.
- Activate or deactivate internships.
- View statistics and method-evaluation information.

### Privacy and security

- Consent is recorded and can be withdrawn.
- Users can export their data or request account deletion.
- Passwords are hashed.
- Login lockout/rate-limiting protections are included.
- Admin authorization is enforced by the backend, not just by hiding web pages.

## Architecture

```text
 Web (Next.js) ─────┐
                    ├── REST API (/api/v1, JSON, Bearer JWT) ──► FastAPI
 Mobile (Expo) ─────┘                                            │
                                                                 ├── Recommendation engine
                                                                 │   eligibility → score
                                                                 │   → rank → explain
                                                                 ▼
                                                            PostgreSQL
```

The web and mobile applications share one API contract. A profile completed in one app is available when the candidate signs in to the other.

## Technology Stack

| Layer | Technology |
|---|---|
| Web application | Next.js 15 |
| Mobile application | Expo / React Native |
| Backend API | FastAPI |
| Database | PostgreSQL |
| ORM and migrations | SQLAlchemy, Alembic |
| Recommendation engine | Python; exact matching and TF-IDF, with optional semantic methods |
| API documentation | Swagger / OpenAPI |
| Local database development | Docker Compose |

## Repository Structure

```text
InternSetu/
├── backend/                  # FastAPI service, engine, migrations, data and tests
├── web/                      # Next.js candidate app and admin console
├── mobile/                   # Expo / React Native app
├── packages/                 # Shared packages, if present in this checkout
├── docs/                     # UML guide, research paper and integration notes
├── docker-compose.yml        # Local PostgreSQL service
└── .gitignore
```

### Important backend directories

| Path | Purpose |
|---|---|
| `backend/app/api/routes/` | HTTP endpoints for authentication, profile, recommendations, discovery, taxonomy, admin and health |
| `backend/app/core/` | Configuration, database session, JWT/password hashing, role checks, error format and login rate limit |
| `backend/app/models/` and `backend/app/schemas/` | Database models and API request/response shapes |
| `backend/app/services/` | Recommendation, profile, consent, normalization, dataset-loading and admin logic |
| `backend/app/engine/` | Eligibility, scoring, skill matching, ranking and explanations |
| `backend/app/scripts/` | CLI tools such as `load_datasets`, `create_admin`, `check_db` and `smoke_test` |
| `backend/alembic/` | Database migrations |
| `backend/data/` | Synthetic datasets and taxonomy |
| `backend/tests/` | Automated backend tests |
| `web/app/[locale]/` | Localized candidate and admin pages |
| `web/app/components/`, `web/app/lib/`, `web/i18n/`, `web/messages/` | Shared UI, API client/store and translations |
| `mobile/src/screens/`, `mobile/src/components/` | Mobile screens and shared components |
| `mobile/src/api.ts`, `store.ts`, `theme.ts`, `i18n.tsx` | Mobile API, state, theme and language support |

## Prerequisites

Install the following tools:

- Git
- Python 3.11–3.14 (use a version supported by the project's dependency files)
- PostgreSQL 14+; the included Docker Compose setup can run PostgreSQL locally
- Node.js 20+ and npm
- Docker Desktop and Docker Compose, if using the included database container
- Expo Go on a phone, or an Android emulator / iOS simulator, for mobile testing

Verify installations:

```bash
git --version
python --version
node --version
npm --version
docker --version
docker compose version
```

## Getting Started

Start PostgreSQL and the backend before starting either client application.

### 1. Clone the Repository

```bash
git clone https://github.com/Harshita-Kashyap/InternSetu.git
cd InternSetu
```

### 2. Configure and Start PostgreSQL

The repository includes a Docker Compose configuration for local PostgreSQL.

From the project root:

```bash
docker compose up -d
docker compose ps
```

PostgreSQL should be available on port `5432`. The current local configuration uses:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `internsetu` |
| Username | `internsetu` |
| Password | `internsetu_dev_password` (local development default) |

Check the connection:

```bash
docker exec internsetu-postgres psql -U internsetu -d internsetu -c "SELECT 1;"
```

> These credentials are for local development only. Do not reuse them in production.

If you use an independently installed PostgreSQL server instead, create an empty database named `internsetu` and update `DATABASE_URL` accordingly.

### 3. Set Up the Backend

From the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment in Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Optional dependencies for hybrid/semantic recommendation methods:

```bash
pip install -r requirements-ml.txt
```

Create your local environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Edit `backend/.env` and set at least the database URL and a strong secret key. For the included local Docker Compose configuration, the database URL is:

```dotenv
DATABASE_URL=postgresql+psycopg://internsetu:internsetu_dev_password@localhost:5432/internsetu
```

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Put the generated value in `SECRET_KEY`. Configure `CORS_ORIGINS` to include the local web origin, typically `http://localhost:3000`, using the format expected by `.env.example`.

> Never commit `.env` or real secrets to Git.

### 4. Run Database Migrations and Load Data

Run these commands from the `backend/` directory with the virtual environment activated:

```bash
alembic upgrade head
alembic current
python -m app.scripts.load_datasets --all
```

The dataset-loading command is required for the demo recommendation experience; without loaded data, there may be no internships to recommend.

Create an administrator account when needed:

```bash
python -m app.scripts.create_admin --name "Your Name" --email you@example.com
```

The command prompts for a password. Use an email address you control.

Start the backend:

```bash
uvicorn app.main:app --reload
```

The API is now available at `http://127.0.0.1:8000`.

For testing on a physical phone over the same Wi-Fi network, start the server with:

```bash
uvicorn app.main:app --reload --host 0.0.0.0
```

Use your computer's LAN IP in the mobile app configuration. Only expose the development server on a trusted network.

### 5. Start the Web App

Open a new terminal at the project root:

```bash
cd web
npm install
```

Create the local environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Set the API URL in `web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`. The app redirects to `/en` by default.

### 6. Start the Mobile App

Open another terminal at the project root:

```bash
cd mobile
npm install
```

Create `mobile/.env` from the example:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` according to where the app is running:

| Mobile environment | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical phone | `http://<your-PC-LAN-IP>:8000` |

Start Expo:

```bash
npx expo start
```

Press `a` to open an Android emulator, or scan the QR code using Expo Go. A physical phone and computer must be on the same network, and the backend must be reachable from the phone.

## Admin Access

Open `/en/admin` in the web app or choose **Administrator sign-in** on the login page.

Admin accounts are not created through public sign-up. Create an admin using `python -m app.scripts.create_admin` as described above.

Authorization is enforced on the backend: requests to `/api/v1/admin/*` are rejected with `401 Unauthorized` or `403 Forbidden` when authentication or permissions are insufficient, regardless of what the web interface displays.

## API Documentation

With the backend running:

- Swagger / OpenAPI UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

Check the health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "InternSetu API"
}
```

Use the current OpenAPI documentation to explore available endpoints. The earlier development-only `POST /users/` example is not presented here as a supported current workflow because the latest project version uses its authentication and profile APIs.

## Testing and Verification

### Backend tests

From `backend/`:

```bash
pytest
```

The project documentation reports **92 backend tests**, using in-memory SQLite so the test suite does not require PostgreSQL. Tests cover authentication, consent, profiles, recommendations and discovery, saved internships, taxonomy, admin routes and dataset loaders. A test also compares database-layer results with the standalone engine for 40 candidates.

Run a smoke test against a running backend:

```bash
python -m app.scripts.smoke_test
```

### Web checks

From `web/`:

```bash
npx tsc --noEmit
npx next build
```

### Mobile type check

From `mobile/`:

```bash
npm run typecheck
```

These commands are the documented verification workflow; actual results depend on the current checkout and local environment.

## Recommendation Method

InternSetu uses a staged recommendation pipeline:

1. **Normalize the profile:** Map candidate input to a fixed taxonomy. Synonyms and Hindi/Marathi names are supported; unknown free-text values can be flagged for admin review.
2. **Apply the hard eligibility gate:** Reject an internship if the candidate's education is below its requirement or any mandatory skill is missing.
3. **Calculate the score:** Score eligible internships out of 100 using six weighted factors.

   | Factor | Default weight |
   |---|---:|
   | Skills | 30% |
   | Education | 25% |
   | Location | 20% |
   | Sector | 15% |
   | Role | 5% |
   | Preferences | 5% |
   | **Total** | **100%** |

   The general formula is `Score = 100 × Σ (factor weight × factor score)`, where factor weights and factor scores use the engine's normalized scale. Admin-configured weights must total 100%.

4. **Match skills:** The documented pipeline includes exact keyword matching and TF-IDF cosine similarity. Optional sentence-embedding support is implemented as an option but has not been evaluated.
5. **Rank results:** Sort by score, then skills, then education, then internship ID. Return the top 3–5 eligible results.
6. **Explain recommendations:** Generate template-based reasons tied to the actual sub-scores, with suggestions for closing skill gaps.

**Important distinction:** Eligibility and match score are separate. Location and preferred skills affect matching, but they do not fail the hard eligibility gate.

## Evaluation

The documented evaluation uses a synthetic dataset:

| Item | Reported value |
|---|---:|
| Candidates | 350 |
| Internships | 750 |
| Labelled candidate–internship pairs | 7,000 |
| Eligibility-gate agreement with labels | 100% |
| Ineligible items among top-five results when the gate was removed | 46.3% |
| NDCG@5 for TF-IDF and LSA relative to exact matching | About 0.99 |
| Average eligible internships per candidate | 3.7 |
| Full-catalogue ranking latency | About 1.3–3.9 ms per request |

TF-IDF and LSA stayed close to exact matching on NDCG@5 while changing around 40% of top-five items. The relatively small eligible pool makes the nearest-internship fallback useful.

> **How to interpret these results:** Labels were generated using a rule-based rubric. These figures demonstrate the behaviour of the design on synthetic data; they do not establish real-world recommendation accuracy or prove performance on official PMIS vacancies. See `docs/` for the research paper.

## Troubleshooting

### PostgreSQL is not running

From the project root:

```bash
docker compose up -d
docker compose ps
```

### Check the PostgreSQL connection

```bash
docker exec internsetu-postgres psql -U internsetu -d internsetu -c "SELECT 1;"
```

### List database tables

```bash
docker exec internsetu-postgres psql -U internsetu -d internsetu -c "\dt"
```

If no tables exist, verify `DATABASE_URL` and run `alembic upgrade head` from `backend/`.

### Check Python dependencies

With the backend virtual environment activated:

```bash
python -m pip check
```

### No internships appear

Confirm the database migrations have been applied and load the synthetic datasets:

```bash
cd backend
alembic upgrade head
python -m app.scripts.load_datasets --all
```

### Mobile app cannot connect to the API

- Do not use `localhost` for an Android emulator; use `http://10.0.2.2:8000`.
- For a physical phone, use your computer's LAN IP and start Uvicorn with `--host 0.0.0.0`.
- Ensure both devices are on the same network and the firewall permits the connection.
- Confirm the backend is running and `EXPO_PUBLIC_API_URL` is correct.

### Stop services

Stop the backend with `Ctrl+C`.

Stop PostgreSQL without deleting its data:

```bash
docker compose stop
```

> **Caution:** `docker compose down -v` deletes the Compose-managed database volume and its stored data. Do not run it unless you intentionally want to remove the local database data.

## Privacy and Security

InternSetu includes consent recording and withdrawal, data export, account-deletion functionality, hashed passwords, login lockout/rate limiting, and backend-enforced admin authorization.

For local development, use a strong random `SECRET_KEY`, keep `.env` files out of version control, and do not expose development services to untrusted networks. Review configuration, access control, data retention, and deployment security before using real candidate data.

## Limitations and Future Work

- The current release uses synthetic data only; it does not use real PMIS vacancy or candidate data.
- No human-reviewer study or usability trial has been conducted yet.
- The optional sentence-embedding method has not been evaluated.
- Password reset and notifications are stubs; email/SMS delivery is not configured.
- Academic percentages and work mode are intentionally not collected because no current eligibility rule or scoring weight uses them.
- New interface text may remain in English until Hindi/Marathi translations are added.
- The evaluation is based on rule-generated labels and should not be interpreted as real-world accuracy.

## Deployment Notes

The backend includes a Docker Compose deployment path. From `backend/`, the documented flow is:

```bash
docker compose up --build
docker compose exec api python -m app.scripts.load_datasets --all
```

Check the Compose files and environment configuration in your checkout before running these commands, as deployment configuration may differ between local-development and production setups.

For production:

- Put TLS in front of the service (the repository includes a `Caddyfile`).
- Use a long, randomly generated `SECRET_KEY`.
- Never commit `.env` files or secrets.
- Prefer `alembic upgrade head` for schema changes rather than relying on `create_all`.
- Configure secure database credentials, origins, logging, backups and access controls.
- Do not present synthetic demo internships as official PMIS vacancies.

## Git Workflow

Before starting work, synchronize with the repository's agreed default branch. For example, if the team uses `main`:

```bash
git switch main
git pull origin main
```

Create a feature branch:

```bash
git switch -c feature/your-feature-name
```

After making changes:

```bash
git status
git add .
git commit -m "feat: describe your change"
git push -u origin feature/your-feature-name
```

Open a Pull Request on GitHub for review rather than pushing feature work directly to the shared branch. If your team uses `master` instead of `main`, replace the branch name consistently with the actual repository default.

## Team

- **Project Guide:** Prof. Swati Sharma
- Harshita Kashyap
- Ishika Choudhary
- Jiya Khatri
- Krishna Sharma

Department of Computer Science & Engineering, SVIIT, Indore, Madhya Pradesh, India.

## License

No license has been chosen yet. Add a license before publishing or distributing the repository.
