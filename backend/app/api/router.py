from fastapi import APIRouter

from app.api.routes import admin, auth, me, profile, recommendations, taxonomy

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(taxonomy.router)
api_router.include_router(profile.router)
api_router.include_router(recommendations.router)
api_router.include_router(admin.router)
