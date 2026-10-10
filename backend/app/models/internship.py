from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.utils import utcnow

MANDATORY = "mandatory"  # decides eligibility (REQ-4.4.2)
PREFERRED = "preferred"  # only changes the score


class Internship(Base):
    __tablename__ = "internships"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)  # ISU-000001
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sector_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), index=True, nullable=False)
    role_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), index=True, nullable=False)
    location_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), index=True, nullable=False)
    min_education_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=False)
    degree_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    field_of_study_id: Mapped[str | None] = mapped_column(ForeignKey("taxonomy_entries.id"), nullable=True)
    education_note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    duration_label: Mapped[str] = mapped_column(String(30), nullable=False)
    duration_weeks: Mapped[int] = mapped_column(nullable=False)
    stipend_inr_per_month: Mapped[int | None] = mapped_column(nullable=True)
    facilities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    application_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true(), index=True, nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(default=True, server_default=sa.true(), nullable=False)
    dataset_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    skills: Mapped[list["InternshipSkill"]] = relationship(cascade="all, delete-orphan")


class InternshipSkill(Base):
    __tablename__ = "internship_skills"

    internship_id: Mapped[int] = mapped_column(ForeignKey("internships.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("taxonomy_entries.id"), primary_key=True, index=True)
    kind: Mapped[str] = mapped_column(String(10), nullable=False)  # mandatory | preferred
