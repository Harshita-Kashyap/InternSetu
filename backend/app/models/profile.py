from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.utils import utcnow

# kinds of taxonomy links on a profile
LINK_KINDS = ("skill", "interest", "preferred_role", "preferred_sector", "preferred_location", "language")


class CandidateProfile(Base):
    """A real user's profile (user_id set) or a synthetic research profile (is_synthetic, no user)."""

    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=True
    )
    external_id: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)  # CAND-000001
    is_synthetic: Mapped[bool] = mapped_column(default=False, server_default=sa.false(), nullable=False)
    status: Mapped[str] = mapped_column(String(10), default="draft", server_default="draft", nullable=False)

    education_level_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    degree_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    field_of_study_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    year_of_completion: Mapped[int | None] = mapped_column(nullable=True)

    home_location_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    # Free text for values not in the taxonomy ("Other"). Display/contact only; the engine uses the *_id columns.
    degree_other: Mapped[str | None] = mapped_column(String(120), nullable=True)
    field_of_study_other: Mapped[str | None] = mapped_column(String(120), nullable=True)
    home_location_other: Mapped[str | None] = mapped_column(String(120), nullable=True)

    willing_to_relocate: Mapped[bool] = mapped_column(default=False, server_default=sa.false(), nullable=False)
    willing_to_travel: Mapped[bool] = mapped_column(default=False, server_default=sa.false(), nullable=False)

    duration_label: Mapped[str | None] = mapped_column(String(30), nullable=True)
    duration_weeks: Mapped[int | None] = mapped_column(nullable=True)
    stipend_expectation: Mapped[int | None] = mapped_column(nullable=True)
    work_mode_preference: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role_preference_strength: Mapped[str | None] = mapped_column(String(10), nullable=True)

    overall_skill_level: Mapped[str | None] = mapped_column(String(15), nullable=True)
    has_prior_internship: Mapped[bool] = mapped_column(default=False, server_default=sa.false(), nullable=False)
    internship_count: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    project_count: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    english_proficiency: Mapped[str | None] = mapped_column(String(15), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now(), nullable=False
    )

    links: Mapped[list["CandidateLink"]] = relationship(cascade="all, delete-orphan")


class CandidateLink(Base):
    __tablename__ = "candidate_links"

    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profiles.id", ondelete="CASCADE"), primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), primary_key=True)
