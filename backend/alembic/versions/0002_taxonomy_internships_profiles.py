"""taxonomy, internships, candidate profiles

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TX = "taxonomy_entries.id"


def upgrade() -> None:
    op.create_table(
        "taxonomy_entries",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("parent_id", sa.String(40), nullable=True),
        sa.Column("order_rank", sa.Integer(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_taxonomy_entries_type", "taxonomy_entries", ["type"])
    op.create_index("ix_taxonomy_entries_parent_id", "taxonomy_entries", ["parent_id"])

    op.create_table(
        "taxonomy_translations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.String(40), sa.ForeignKey(TX, ondelete="CASCADE"), nullable=False),
        sa.Column("lang", sa.String(5), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.UniqueConstraint("entry_id", "lang", name="uq_translation_entry_lang"),
    )
    op.create_index("ix_taxonomy_translations_entry_id", "taxonomy_translations", ["entry_id"])

    op.create_table(
        "taxonomy_synonyms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.String(40), sa.ForeignKey(TX, ondelete="CASCADE"), nullable=False),
        sa.Column("synonym", sa.String(200), nullable=False),
        sa.Column("normalized", sa.String(200), nullable=False),
        sa.UniqueConstraint("entry_id", "normalized", name="uq_synonym_entry_norm"),
    )
    op.create_index("ix_taxonomy_synonyms_entry_id", "taxonomy_synonyms", ["entry_id"])
    op.create_index("ix_taxonomy_synonyms_normalized", "taxonomy_synonyms", ["normalized"])

    op.create_table(
        "flagged_values",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("entry_type", sa.String(20), nullable=False),
        sa.Column("raw_text", sa.String(200), nullable=False),
        sa.Column("normalized", sa.String(200), nullable=False),
        sa.Column("suggested_entry_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("status", sa.String(10), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_flagged_values_normalized", "flagged_values", ["normalized"])

    op.create_table(
        "internships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.String(30), nullable=False),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sector_id", sa.String(40), sa.ForeignKey(TX), nullable=False),
        sa.Column("role_id", sa.String(40), sa.ForeignKey(TX), nullable=False),
        sa.Column("location_id", sa.String(40), sa.ForeignKey(TX), nullable=False),
        sa.Column("min_education_id", sa.String(40), sa.ForeignKey(TX), nullable=False),
        sa.Column("degree_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("field_of_study_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("education_note", sa.String(300), nullable=True),
        sa.Column("duration_label", sa.String(30), nullable=False),
        sa.Column("duration_weeks", sa.Integer(), nullable=False),
        sa.Column("stipend_inr_per_month", sa.Integer(), nullable=True),
        sa.Column("facilities", sa.JSON(), nullable=False),
        sa.Column("application_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("dataset_version", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_internships_external_id", "internships", ["external_id"], unique=True)
    op.create_index("ix_internships_sector_id", "internships", ["sector_id"])
    op.create_index("ix_internships_role_id", "internships", ["role_id"])
    op.create_index("ix_internships_location_id", "internships", ["location_id"])
    op.create_index("ix_internships_is_active", "internships", ["is_active"])

    op.create_table(
        "internship_skills",
        sa.Column("internship_id", sa.Integer(), sa.ForeignKey("internships.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("skill_id", sa.String(40), sa.ForeignKey(TX), primary_key=True),
        sa.Column("kind", sa.String(10), nullable=False),
    )
    op.create_index("ix_internship_skills_skill_id", "internship_skills", ["skill_id"])

    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("external_id", sa.String(30), nullable=True),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(10), nullable=False, server_default="draft"),
        sa.Column("education_level_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("degree_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("field_of_study_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("year_of_completion", sa.Integer(), nullable=True),
        sa.Column("home_location_id", sa.String(40), sa.ForeignKey(TX), nullable=True),
        sa.Column("willing_to_relocate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("willing_to_travel", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("duration_label", sa.String(30), nullable=True),
        sa.Column("duration_weeks", sa.Integer(), nullable=True),
        sa.Column("stipend_expectation", sa.Integer(), nullable=True),
        sa.Column("work_mode_preference", sa.String(20), nullable=True),
        sa.Column("role_preference_strength", sa.String(10), nullable=True),
        sa.Column("overall_skill_level", sa.String(15), nullable=True),
        sa.Column("has_prior_internship", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("internship_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("project_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("english_proficiency", sa.String(15), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_candidate_profiles_user_id", "candidate_profiles", ["user_id"], unique=True)
    op.create_index("ix_candidate_profiles_external_id", "candidate_profiles", ["external_id"], unique=True)

    op.create_table(
        "candidate_links",
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("entry_id", sa.String(40), sa.ForeignKey(TX), primary_key=True),
        sa.Column("kind", sa.String(20), primary_key=True),
    )


def downgrade() -> None:
    for t in ("candidate_links", "candidate_profiles", "internship_skills", "internships",
              "flagged_values", "taxonomy_synonyms", "taxonomy_translations", "taxonomy_entries"):
        op.drop_table(t)
