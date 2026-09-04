# InternSetu

InternSetu is an AI-assisted internship recommendation engine for the PM Internship Scheme.

## Project Structure

```text
InternSetu/
├── backend/           # FastAPI backend
├── mobile/            # Mobile application
├── packages/          # Shared packages
├── web/               # Web application
├── docker-compose.yml # Local PostgreSQL
└── .gitignore
Backend Setup
Prerequisites

Install:

Git
Python 3.14+
Docker Desktop

Verify the installations:

git --version
python --version
docker --version
docker compose version
1. Clone the repository
git clone https://github.com/Harshita-Kashyap/InternSetu.git
cd InternSetu
2. Create the Python virtual environment
cd backend
python -m venv .venv

Activate it on Windows PowerShell:

.\.venv\Scripts\Activate.ps1
3. Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
4. Configure environment variables

Create your local .env file from the example:

Copy-Item .env.example .env

The local .env should contain:

DATABASE_URL=postgresql+psycopg://internsetu:internsetu_dev_password@localhost:5432/internsetu

Do not commit .env.

5. Start PostgreSQL

From the project root:

cd ..
docker compose up -d

Verify:

docker compose ps

PostgreSQL should be running on port 5432.

6. Run database migrations

Go back into the backend:

cd backend
alembic upgrade head

Check the current migration:

alembic current

The migration should show the current revision as head.

7. Start the FastAPI server
uvicorn app.main:app --reload

The API will be available at:

http://127.0.0.1:8000
8. Verify the API

Health check:

curl http://127.0.0.1:8000/health

Expected response:

{
  "status": "ok",
  "service": "InternSetu API"
}

Swagger API documentation:

http://127.0.0.1:8000/docs
9. Test user creation

Open Swagger at /docs and use:

POST /users/

Example request:

{
  "email": "developer@example.com",
  "full_name": "Developer"
}

A successful response should contain the created user's ID, email, and full name.

Database

PostgreSQL runs locally through Docker Compose.

Setting    Value
Host    localhost
Port    5432
Database    internsetu
User    internsetu

Start PostgreSQL:

docker compose up -d

Stop PostgreSQL:

docker compose stop

The PostgreSQL data is stored in a Docker volume.

Do not run the following unless you intentionally want to delete the local database volume:

docker compose down -v
Migrations

Create a migration after changing SQLAlchemy models:

alembic revision --autogenerate -m "describe change"

Apply migrations:

alembic upgrade head

Check migration status:

alembic current
Git Workflow

Before starting work:

git pull origin master

Create a feature branch:

git checkout -b feature/your-feature-name

After making changes:

git status
git add .
git commit -m "feat: describe your change"
git push -u origin feature/your-feature-name

Create a Pull Request on GitHub instead of pushing feature work directly to master.

Troubleshooting
PostgreSQL is not running
docker compose up -d
docker compose ps
Check PostgreSQL connection
docker exec internsetu-postgres psql -U internsetu -d internsetu -c "SELECT 1;"
Check database tables
docker exec internsetu-postgres psql -U internsetu -d internsetu -c "\dt"
Check Python dependencies
python -m pip check
Stop the backend

Press:

CTRL+C
Current Backend Features
FastAPI application
PostgreSQL 17
SQLAlchemy ORM
Alembic migrations
User model
User creation API
Email validation
Duplicate email protection
Health check endpoint
Swagger/OpenAPI documentation
