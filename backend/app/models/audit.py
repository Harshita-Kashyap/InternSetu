from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.utils import utcnow


class AdminAudit(Base):
    """Who changed what in the admin console (weights, taxonomy, imports, listings). Never holds candidate data."""

    __tablename__ = "admin_audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    admin_email: Mapped[str | None] = mapped_column(String(255), nullable=True)   # kept so the log stays readable
    action: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    target: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    details: Mapped[str] = mapped_column(Text, default="{}", nullable=False)       # JSON text
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False)
