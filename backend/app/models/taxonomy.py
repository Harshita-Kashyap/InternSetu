from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.utils import utcnow

ENTRY_TYPES = (
    "education_level", "degree", "field_of_study", "skill_category", "skill",
    "sector", "role_domain", "role", "interest", "state", "city",
)


class TaxonomyEntry(Base):
    __tablename__ = "taxonomy_entries"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # e.g. SK-PROG-001
    type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # English
    parent_id: Mapped[str | None] = mapped_column(String(40), index=True, nullable=True)
    order_rank: Mapped[int | None] = mapped_column(nullable=True)  # education levels: low -> high
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true(), nullable=False)

    synonyms: Mapped[list["TaxonomySynonym"]] = relationship(cascade="all, delete-orphan")


class TaxonomySynonym(Base):
    __tablename__ = "taxonomy_synonyms"
    __table_args__ = (UniqueConstraint("entry_id", "normalized", name="uq_synonym_entry_norm"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id", ondelete="CASCADE"), index=True)
    synonym: Mapped[str] = mapped_column(String(200), nullable=False)
    normalized: Mapped[str] = mapped_column(String(200), index=True, nullable=False)


class FlaggedValue(Base):
    """Free text that could not be mapped to the taxonomy; waits for admin review (REQ-4.3.4)."""

    __tablename__ = "flagged_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entry_type: Mapped[str] = mapped_column(String(20), nullable=False)
    raw_text: Mapped[str] = mapped_column(String(200), nullable=False)
    normalized: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    suggested_entry_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="pending", server_default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
