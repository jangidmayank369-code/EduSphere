"""Add additional student profile fields.

Revision ID: 20261021_student_profile_details
Revises: 20261020_student_class_section
Create Date: 2026-10-21

All columns are nullable; existing student records remain valid and unchanged.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261021_student_profile_details"
down_revision = "20261020_student_class_section"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("enrollment_number", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("government_id_number", sa.String(length=50), nullable=True))
    op.add_column("students", sa.Column("house", sa.String(length=80), nullable=True))
    op.add_column("students", sa.Column("category", sa.String(length=80), nullable=True))
    op.add_column("students", sa.Column("religion", sa.String(length=80), nullable=True))
    op.add_column("students", sa.Column("previous_school", sa.String(length=200), nullable=True))
    op.add_column("students", sa.Column("admission_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "admission_date")
    op.drop_column("students", "previous_school")
    op.drop_column("students", "religion")
    op.drop_column("students", "category")
    op.drop_column("students", "house")
    op.drop_column("students", "government_id_number")
    op.drop_column("students", "enrollment_number")
