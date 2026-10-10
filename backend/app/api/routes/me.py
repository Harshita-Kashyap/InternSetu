from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.security import verify_password
from app.core.utils import utcnow
from app.models.user import ROLE_ADMIN
from app.schemas.auth import MessageResponse
from app.schemas.consent import ConsentStatusResponse, DeleteAccountRequest
from app.schemas.user import UserResponse
from app.services import consent as consent_service

router = APIRouter(prefix="/me", tags=["Me"])


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
    """All data held about the user (DPDP right to access). Profile and
    recommendations are added here as those features are built."""
    return {
        "exported_at": utcnow().isoformat(),
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
        "consents": consent_service.status(db, user.id).model_dump(mode="json")["records"],
        "profile": None,
        "recommendations": None,
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
