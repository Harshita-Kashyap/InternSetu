from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.utils import utcnow

ROLE_CANDIDATE = "candidate"
ROLE_ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email IS NOT NULL OR mobile IS NOT NULL", name="ck_users_email_or_mobile"),
        CheckConstraint("role IN ('candidate', 'admin')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(15), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default=ROLE_CANDIDATE, server_default=ROLE_CANDIDATE, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true(), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(5), default="en", server_default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    consents: Mapped[list["Consent"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="Consent.id"
    )
    profile: Mapped["CandidateProfile | None"] = relationship(cascade="all, delete-orphan", uselist=False)
    saved: Mapped[list["SavedInternship"]] = relationship(cascade="all, delete-orphan")
