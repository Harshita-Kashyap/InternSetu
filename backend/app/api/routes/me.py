from fastapi import APIRouter

from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.config import settings
from app.core.otp import make_code, otp_limiter, used_codes, verify_code
from app.core.security import verify_password
from app.core.utils import utcnow
from app.models import CandidateProfile, Internship, SavedInternship
from app.models.user import ROLE_ADMIN
from app.schemas.auth import MessageResponse
from app.schemas.consent import ConsentStatusResponse, DeleteAccountRequest
from app.schemas.user import SettingsUpdate, UserResponse
from app.services import consent as consent_service
from app.services.mailer import kind_code_email, send_email
from app.services import profile as profile_service

router = APIRouter(prefix="/me", tags=["Me"])


@router.patch("/settings", response_model=UserResponse)
def update_settings(payload: SettingsUpdate, user: CurrentUser, db: DbSession):
    """Remember the user's UI language so web and mobile show the same one."""
    user.preferred_language = payload.preferred_language
    db.commit()
    db.refresh(user)
    return user


@router.get("/consent", response_model=ConsentStatusResponse)
def get_consent(user: CurrentUser, db: DbSession):
    return consent_service.status(db, user.id)


@router.post("/consent", response_model=ConsentStatusResponse)
def give_consent(user: CurrentUser, db: DbSession):
    consent_service.grant(db, user.id)
    return consent_service.status(db, user.id)


@router.delete("/consent", response_model=ConsentStatusResponse)
def withdraw_consent(user: CurrentUser, db: DbSession):
    consent_service.withdraw(db, user.id)
    return consent_service.status(db, user.id)


@router.get("/export")
def export_my_data(user: CurrentUser, db: DbSession):
    """All data held about the user (DPDP right to access). Recommendations are calculated on demand, not stored."""
    p = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    saved = list(db.scalars(select(Internship.external_id).join(SavedInternship, SavedInternship.internship_id == Internship.id)
                            .where(SavedInternship.user_id == user.id)))
    return {
        "exported_at": utcnow().isoformat(),
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
        "consents": consent_service.status(db, user.id).model_dump(mode="json")["records"],
        "profile": profile_service.to_response(p).model_dump(mode="json") if p else None,
        "saved_internships": saved,
    }


DELETE_PURPOSE = "delete-account"


@router.post("/delete-code", response_model=MessageResponse, status_code=202)
def send_delete_code(user: CurrentUser):
    """Email a 6-digit code that confirms account deletion (for people who sign in with a code, not a password)."""
    if user.role == ROLE_ADMIN:
        raise ApiError(403, "forbidden", "Administrator accounts cannot be deleted here.")
    if not user.email:
        raise ApiError(400, "no_email", "Add an email address to your account to get a code.")
    key = f"deletesend:{user.id}"
    if not otp_limiter.can_send(key):
        raise ApiError(429, "too_soon", "Please wait a minute before asking for another code.")
    otp_limiter.sent(key)
    subject, body = kind_code_email("delete", make_code(settings.secret_key, user.id, user.password_hash, DELETE_PURPOSE), user.preferred_language)
    send_email(user.email, subject, body)
    return MessageResponse(message="A code has been sent to your email.")


@router.delete("", response_model=MessageResponse)
def delete_my_account(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession):
    if user.role == ROLE_ADMIN:
        raise ApiError(403, "forbidden", "Administrator accounts cannot be deleted here.")
    if payload.code:
        key = f"delete:{user.id}"
        if otp_limiter.locked(key):
            raise ApiError(429, "too_many_attempts", "Too many wrong codes. Please try again in 15 minutes.")
        if not verify_code(settings.secret_key, user.id, user.password_hash, DELETE_PURPOSE, payload.code) \
                or not used_codes.use(user.id, DELETE_PURPOSE, payload.code):
            otp_limiter.wrong(key)
            raise ApiError(400, "invalid_code", "That code is not correct or has expired. Please ask for a new one.")
        otp_limiter.clear(key)
    elif not verify_password(payload.password or "", user.password_hash):
        raise ApiError(400, "wrong_password", "Your password is incorrect.")
    db.delete(user)  # consents are removed by cascade
    db.commit()
    return MessageResponse(message="Your account and data have been deleted.")
