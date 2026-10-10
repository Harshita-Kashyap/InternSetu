from fastapi import APIRouter

from app.core.deps import AdminUser

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ping")
def admin_ping(admin: AdminUser):
    """Lets the web app confirm the logged-in user really is an admin."""
    return {"status": "ok", "admin": admin.full_name}
