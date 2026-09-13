"""add academic session integrity constraints

Revision ID: add_school_session_integrity
Revises: 8f023d809334
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_school_session_integrity"
down_revision: Union[str, Sequence[str], None] = "8f023d809334"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_foreign_key(
        "fk_academic_sessions_school_id",
        "academic_sessions",
        "schools",
        ["school_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_index(
        "uq_academic_sessions_current_per_school",
        "academic_sessions",
        ["school_id"],
        unique=True,
        postgresql_where=sa.text("is_current IS TRUE"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_academic_sessions_current_per_school",
        table_name="academic_sessions",
    )

    op.drop_constraint(
        "fk_academic_sessions_school_id",
        "academic_sessions",
        type_="foreignkey",
    )