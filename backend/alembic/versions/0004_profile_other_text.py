"""profile free-text 'Other' values for degree, field of study and home city

Revision ID: 0004
Revises: 0003
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

COLS = ("degree_other", "field_of_study_other", "home_location_other")


def upgrade() -> None:
    with op.batch_alter_table("candidate_profiles") as b:
        for c in COLS:
            b.add_column(sa.Column(c, sa.String(120), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("candidate_profiles") as b:
        for c in reversed(COLS):
            b.drop_column(c)
