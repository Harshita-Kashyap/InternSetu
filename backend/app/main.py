from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.core.errors import register_exception_handlers

app = FastAPI(
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
