"""add user mfa

Revision ID: e91c3a7f2b10
Revises: dbea3d4a91ae
Create Date: 2026-09-14 20:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e91c3a7f2b10"
down_revision = "dbea3d4a91ae"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_mfa",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("secret_encrypted", sa.String(length=1024), nullable=False),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "recovery_code_hashes",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "enabled_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "last_verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_index(
        op.f("ix_user_mfa_id"),
        "user_mfa",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_user_mfa_user_id"),
        "user_mfa",
        ["user_id"],
        unique=True,
    )

    op.create_index(
        op.f("ix_user_mfa_is_enabled"),
        "user_mfa",
        ["is_enabled"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_mfa_is_enabled"),
        table_name="user_mfa",
    )

    op.drop_index(
        op.f("ix_user_mfa_user_id"),
        table_name="user_mfa",
    )

    op.drop_index(
        op.f("ix_user_mfa_id"),
        table_name="user_mfa",
    )

    op.drop_table("user_mfa")