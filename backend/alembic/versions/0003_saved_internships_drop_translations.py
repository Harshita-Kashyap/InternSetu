"""saved internships; remove unused translations table (UI-only multilingual)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_taxonomy_translations_entry_id", table_name="taxonomy_translations")
    op.drop_table("taxonomy_translations")
    op.create_table(
        "saved_internships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("internship_id", sa.Integer(), sa.ForeignKey("internships.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "internship_id", name="uq_saved_user_internship"),
    )
    op.create_index("ix_saved_internships_user_id", "saved_internships", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_internships_user_id", table_name="saved_internships")
    op.drop_table("saved_internships")
    op.create_table(
        "taxonomy_translations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.String(40), sa.ForeignKey("taxonomy_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lang", sa.String(5), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.UniqueConstraint("entry_id", "lang", name="uq_translation_entry_lang"),
    )
    op.create_index("ix_taxonomy_translations_entry_id", "taxonomy_translations", ["entry_id"])
