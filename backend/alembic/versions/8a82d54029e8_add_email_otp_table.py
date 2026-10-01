"""add email otp table

Revision ID: 8a82d54029e8
Revises: e91c3a7f2b10
Create Date: 2026-09-14 23:15:41.052544

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a82d54029e8"
down_revision: Union[str, Sequence[str], None] = "e91c3a7f2b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create email OTP storage table."""

    op.create_table(
        "email_otps",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "purpose",
            sa.String(length=50),
            nullable=False,
            server_default="mfa_login",
        ),
        sa.Column(
            "code_hash",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "max_attempts",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
        sa.Column(
            "used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        "ix_email_otps_id",
        "email_otps",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_email_otps_user_id",
        "email_otps",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_email_otps_purpose",
        "email_otps",
        ["purpose"],
        unique=False,
    )

    op.create_index(
        "ix_email_otps_expires_at",
        "email_otps",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop email OTP storage table."""

    op.drop_index(
        "ix_email_otps_expires_at",
        table_name="email_otps",
    )

    op.drop_index(
        "ix_email_otps_purpose",
        table_name="email_otps",
    )

    op.drop_index(
        "ix_email_otps_user_id",
        table_name="email_otps",
    )

    op.drop_index(
        "ix_email_otps_id",
        table_name="email_otps",
    )

    op.drop_table("email_otps")