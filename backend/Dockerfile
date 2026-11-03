FROM python:3.12-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "python -c 'import app.models; from app.core.database import Base, engine; Base.metadata.create_all(engine)' && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
