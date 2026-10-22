from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import decode_token
from app.models.user import ROLE_ADMIN, User
from app.services import consent as consent_service

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> User:
    if creds is None:
        raise ApiError(401, "not_authenticated", "Please log in to continue.")
    payload = decode_token(creds.credentials)
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise ApiError(401, "invalid_token", "Invalid login session. Please log in again.")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise ApiError(401, "invalid_token", "Invalid login session. Please log in again.")
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != ROLE_ADMIN:
        raise ApiError(403, "forbidden", "You do not have access to this page.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_consent(user: CurrentUser, db: DbSession) -> User:
    """Profile data and recommendations need an active privacy consent (DPDP)."""
    if consent_service.active_consent(db, user.id) is None:
        raise ApiError(403, "consent_required", "Please accept the privacy notice to continue.")
    return user


ConsentedUser = Annotated[User, Depends(require_consent)]
AdminUser = Annotated[User, Depends(require_admin)]
