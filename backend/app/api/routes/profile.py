from fastapi import APIRouter

from app.core.deps import ConsentedUser, CurrentUser, DbSession
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services import profile as svc

router = APIRouter(prefix="/me/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(user: CurrentUser, db: DbSession):
    """Your profile (an empty draft is created the first time). `missing_fields` says what is still needed."""
    return svc.to_response(svc.get_or_create(db, user))


@router.patch("", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdate, user: ConsentedUser, db: DbSession):
    """Save one step at a time: send only the fields of that step."""
    return svc.to_response(svc.apply_update(db, svc.get_or_create(db, user), payload))


@router.post("/confirm", response_model=ProfileResponse)
def confirm_profile(user: ConsentedUser, db: DbSession):
    """The 'Get my recommendations' button on the summary screen."""
    return svc.to_response(svc.confirm(db, svc.get_or_create(db, user)))
