"""Add class and section to session-scoped student records.

Revision ID: 20261020_student_class_section
Revises: 20261019_acct_safe
Create Date: 2026-10-20

The new columns are nullable so all existing student records remain valid.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261020_student_class_section"
down_revision = "20261019_acct_safe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("class_name", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("section", sa.String(length=30), nullable=True))


def downgrade() -> None:
    # Reversible schema-only change. No student rows are deleted.
    op.drop_column("students", "section")
    op.drop_column("students", "class_name")
