from fastapi import APIRouter, status
from sqlalchemy import or_, select

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.ratelimit import login_limiter
from app.core.security import create_access_token, dummy_hash, hash_password, verify_password
from app.core.validators import normalize_mobile
from app.models.consent import PURPOSE_RECOMMENDATION, Consent
from app.models.user import ROLE_CANDIDATE, User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


def _parse_identifier(raw: str) -> tuple[str, str] | None:
    raw = raw.strip()
    if "@" in raw:
        return "email", raw.lower()
    try:
        return "mobile", normalize_mobile(raw)
    except ValueError:
        return None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession):
    conditions = []
    if payload.email:
        conditions.append(User.email == payload.email)
    if payload.mobile:
        conditions.append(User.mobile == payload.mobile)
    if db.scalar(select(User.id).where(or_(*conditions)).limit(1)) is not None:
        raise ApiError(409, "account_exists", "An account with this email or mobile number already exists.")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        role=ROLE_CANDIDATE,  # never taken from the request
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    db.flush()
    db.add(Consent(user_id=user.id, purpose=PURPOSE_RECOMMENDATION, version=settings.consent_version))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise ApiError(409, "account_exists", "An account with this email or mobile number already exists.")
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession):
    parsed = _parse_identifier(payload.identifier)
    key = f"{parsed[0]}:{parsed[1]}" if parsed else f"raw:{payload.identifier.strip().lower()}"
    login_limiter.check(key)

    user = None
    if parsed:
        column = User.email if parsed[0] == "email" else User.mobile
        user = db.scalar(select(User).where(column == parsed[1]))

    password_ok = verify_password(payload.password, user.password_hash if user else dummy_hash())
    if user is None or not password_ok:
        login_limiter.fail(key)
        raise ApiError(401, "invalid_credentials", "Incorrect email, mobile number or password.")
    if not user.is_active:
        raise ApiError(403, "account_disabled", "This account has been disabled.")

    login_limiter.reset(key)
    return _token_response(user)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return user


@router.post("/change-password", response_model=MessageResponse)
def change_password(payload: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    if not verify_password(payload.current_password, user.password_hash):
        raise ApiError(400, "wrong_password", "Your current password is incorrect.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password changed.")


# --- Release 1.0: no email/SMS gateway (TBD-1), so reset is not available yet. ---
@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(payload: ForgotPasswordRequest):
    return MessageResponse(message="If an account exists, reset instructions will be sent.")


@router.post("/reset-password", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def reset_password():
    raise ApiError(501, "not_available", "Password reset is not available in this release.")
