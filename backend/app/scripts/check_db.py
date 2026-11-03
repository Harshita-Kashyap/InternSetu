"""Quick check that DATABASE_URL works: python -m app.scripts.check_db"""
from sqlalchemy import text

from app.core.database import engine


with engine.connect() as connection:
    result = connection.execute(text("SELECT 1"))
    print(result.scalar())
    print("PostgreSQL connection successful!")