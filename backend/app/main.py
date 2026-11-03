import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.core.errors import register_exception_handlers

def _warm_up():
    """Build the engine and its scorers once at start-up so the first request is fast (SRS: ~3 s target)."""
    try:
        from app.core.database import SessionLocal
        from app.services.recommendations import get_engine

        with SessionLocal() as db:
            eng = get_engine(db)
            eng._get_tfidf()
            try:
                eng._get_semantic()
            except Exception:  # semantic model optional; hybrid falls back with a clear error
                pass
    except Exception:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.getenv("WARM_UP", "1") != "0":
        threading.Thread(target=_warm_up, daemon=True).start()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="InternSetu API",
    description="AI-assisted internship recommendation engine for PM Internship Scheme",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(health_router)
app.include_router(api_router)


@app.get("/")
def root():
    return {"message": "Welcome to InternSetu API", "status": "running"}
