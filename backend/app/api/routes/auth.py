from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.otp import make_code, otp_limiter, used_codes, verify_code
from app.core.ratelimit import login_limiter
from app.core.security import create_access_token, decode_token, dummy_hash, hash_password, verify_password
from app.core.utils import utcnow
from app.core.validators import normalize_mobile
from app.models.consent import PURPOSE_RECOMMENDATION, Consent
from app.models.user import ROLE_CANDIDATE, User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterCodeRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.mailer import kind_code_email, reset_code_email, send_email

router = APIRouter(prefix="/auth", tags=["Auth"])


def _token_response(user: User, session_start: int | None = None) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, session_start=session_start),
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


SIGNUP_PURPOSE = "signup"


@router.post("/register-code", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def request_register_code(payload: RegisterCodeRequest, db: DbSession):
    """Sign-up step 1: email a 6-digit code to prove the address is yours (nothing is created yet)."""
    if db.scalar(select(User.id).where(User.email == payload.email).limit(1)) is not None:
        raise ApiError(409, "account_exists", "An account with this email already exists. Please log in.")
    key = f"signupsend:{payload.email}"
    if not otp_limiter.can_send(key):
        raise ApiError(429, "too_soon", "Please wait a minute before asking for another code.")
    otp_limiter.sent(key)
    subject, body = kind_code_email("signup", make_code(settings.secret_key, 0, payload.email, SIGNUP_PURPOSE), "en")
    send_email(payload.email, subject, body)
    return MessageResponse(message="A code has been sent to your email.")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession):
    conditions = [User.email == payload.email]
    if payload.mobile:
        conditions.append(User.mobile == payload.mobile)
    if db.scalar(select(User.id).where(or_(*conditions)).limit(1)) is not None:
        raise ApiError(409, "account_exists", "An account with this email or mobile number already exists.")

    key = f"signup:{payload.email}"
    if otp_limiter.locked(key):
        raise ApiError(429, "too_many_attempts", "Too many wrong codes. Please try again in 15 minutes.")
    if not verify_code(settings.secret_key, 0, payload.email, SIGNUP_PURPOSE, payload.code) \
            or not used_codes.use(0, f"{SIGNUP_PURPOSE}:{payload.email}", payload.code):
        otp_limiter.wrong(key)
        raise ApiError(400, "invalid_code", "That code is not correct or has expired. Please ask for a new one.")
    otp_limiter.clear(key)
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


# --- Password reset with a 6-digit code sent by email (no database table; see app/core/otp.py) ---
RESET_PURPOSE = "password-reset"
_SAME_ANSWER = "If an account exists for that email, a code has been sent."


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(payload: ForgotPasswordRequest, db: DbSession):
    # Same answer whatever happens, so nobody can use this to find out which emails have accounts.
    parsed = _parse_identifier(payload.identifier)
    if parsed and parsed[0] == "email":
        user = db.scalar(select(User).where(User.email == parsed[1]))
        key = f"reset:{parsed[1]}"
        if user and user.is_active and otp_limiter.can_send(key):
            otp_limiter.sent(key)
            code = make_code(settings.secret_key, user.id, user.password_hash, RESET_PURPOSE)
            subject, body = reset_code_email(code, user.preferred_language)
            send_email(user.email, subject, body)
    return MessageResponse(message=_SAME_ANSWER)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: DbSession):
    bad = ApiError(400, "invalid_code", "That code is not correct or has expired. Please ask for a new one.")
    parsed = _parse_identifier(payload.identifier)
    if not parsed or parsed[0] != "email":
        raise bad
    key = f"reset:{parsed[1]}"
    if otp_limiter.locked(key):
        raise ApiError(429, "too_many_attempts", "Too many wrong codes. Please try again in 15 minutes.")
    user = db.scalar(select(User).where(User.email == parsed[1]))
    if not user or not user.is_active or not verify_code(settings.secret_key, user.id, user.password_hash, RESET_PURPOSE, payload.code):
        otp_limiter.wrong(key)
        raise bad
    user.password_hash = hash_password(payload.new_password)     # also makes this code useless (single use)
    db.commit()
    otp_limiter.clear(key)
    login_limiter.reset(f"{parsed[0]}:{parsed[1]}")
    return MessageResponse(message="Password changed. You can log in now.")



@router.post("/refresh", response_model=TokenResponse)
def refresh_token(user: CurrentUser, creds: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))]):
    """Sliding session: swap a still-valid token for a fresh one. Refused once the login session is older than SESSION_MAX_DAYS."""
    payload = decode_token(creds.credentials) if creds else {}
    started = int(payload.get("ss") or payload.get("iat") or 0)
    if utcnow().timestamp() - started > settings.session_max_days * 86400:
        raise ApiError(401, "session_too_old", "Your session has ended. Please log in again.")
    return _token_response(user, session_start=started)
