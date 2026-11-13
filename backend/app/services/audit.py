"""Admin audit log: one row per admin change. Call after the change succeeded."""
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit import AdminAudit
from app.models.user import User


def record(db: Session, admin: User, action: str, target: str = "", details: dict | None = None) -> None:
    db.add(AdminAudit(admin_id=admin.id, admin_email=admin.email, action=action[:60], target=str(target)[:255],
                      details=json.dumps(details or {}, ensure_ascii=False, default=str)))
    db.commit()


def list_entries(db: Session, limit: int = 50, offset: int = 0, action: str | None = None) -> dict:
    q = select(AdminAudit).order_by(AdminAudit.id.desc())
    if action:
        q = q.where(AdminAudit.action == action)
    rows = db.scalars(q.limit(limit).offset(offset)).all()
    return {"items": [{"id": r.id, "admin_email": r.admin_email, "action": r.action, "target": r.target,
                       "details": json.loads(r.details or "{}"), "created_at": r.created_at.isoformat()} for r in rows]}
