from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.users import router as users_router


app = FastAPI(
    title="InternSetu API",
    description="AI-assisted internship recommendation engine for PM Internship Scheme",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(users_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to InternSetu API",
        "status": "running",
    }
