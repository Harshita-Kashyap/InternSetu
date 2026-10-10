from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.utils import utcnow
from app.models.consent import PURPOSE_RECOMMENDATION, Consent
from app.schemas.consent import ConsentRecord, ConsentStatusResponse


def active_consent(db: Session, user_id: int) -> Consent | None:
    return db.scalar(
        select(Consent)
        .where(
            Consent.user_id == user_id,
            Consent.purpose == PURPOSE_RECOMMENDATION,
            Consent.withdrawn_at.is_(None),
        )
        .order_by(Consent.id.desc())
        .limit(1)
    )


def grant(db: Session, user_id: int) -> None:
    if active_consent(db, user_id) is None:
        db.add(Consent(user_id=user_id, purpose=PURPOSE_RECOMMENDATION, version=settings.consent_version))
        db.commit()


def withdraw(db: Session, user_id: int) -> None:
    c = active_consent(db, user_id)
    if c is not None:
        c.withdrawn_at = utcnow()
        db.commit()


def status(db: Session, user_id: int) -> ConsentStatusResponse:
    records = list(db.scalars(select(Consent).where(Consent.user_id == user_id).order_by(Consent.id)))
    return ConsentStatusResponse(
        has_active_consent=any(r.withdrawn_at is None for r in records),
        current_version=settings.consent_version,
        records=[ConsentRecord.model_validate(r) for r in records],
    )
