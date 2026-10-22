from fastapi import APIRouter

from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.security import verify_password
from app.core.utils import utcnow
from app.models import CandidateProfile, Internship, SavedInternship
from app.models.user import ROLE_ADMIN
from app.schemas.auth import MessageResponse
from app.schemas.consent import ConsentStatusResponse, DeleteAccountRequest
from app.schemas.user import SettingsUpdate, UserResponse
from app.services import consent as consent_service
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


@router.delete("", response_model=MessageResponse)
def delete_my_account(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession):
    if user.role == ROLE_ADMIN:
        raise ApiError(403, "forbidden", "Administrator accounts cannot be deleted here.")
    if not verify_password(payload.password, user.password_hash):
        raise ApiError(400, "wrong_password", "Your password is incorrect.")
    db.delete(user)  # consents are removed by cascade
    db.commit()
    return MessageResponse(message="Your account and data have been deleted.")
