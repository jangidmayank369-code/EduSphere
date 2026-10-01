"""add user sessions

Revision ID: be74e9c3231a
Revises: add_student_fee_plan_v2
Create Date: 2026-09-14 10:21:35.228012

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "be74e9c3231a"
down_revision: Union[str, Sequence[str], None] = "add_student_fee_plan_v2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user sessions table."""

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "ip_address",
            sa.String(length=45),
            nullable=True,
        ),
        sa.Column(
            "user_agent",
            sa.String(length=1024),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_user_sessions_expires_at"),
        "user_sessions",
        ["expires_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_sessions_id"),
        "user_sessions",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_sessions_jti"),
        "user_sessions",
        ["jti"],
        unique=True,
    )

    op.create_index(
        op.f("ix_user_sessions_revoked_at"),
        "user_sessions",
        ["revoked_at"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_sessions_user_id"),
        "user_sessions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop user sessions table."""

    op.drop_index(
        op.f("ix_user_sessions_user_id"),
        table_name="user_sessions",
    )

    op.drop_index(
        op.f("ix_user_sessions_revoked_at"),
        table_name="user_sessions",
    )

    op.drop_index(
        op.f("ix_user_sessions_jti"),
        table_name="user_sessions",
    )

    op.drop_index(
        op.f("ix_user_sessions_id"),
        table_name="user_sessions",
    )

    op.drop_index(
        op.f("ix_user_sessions_expires_at"),
        table_name="user_sessions",
    )

    op.drop_table("user_sessions")