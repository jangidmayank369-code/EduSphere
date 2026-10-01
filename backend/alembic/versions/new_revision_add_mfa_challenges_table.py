"""add mfa challenges table

Revision ID: 91f0b7c3a6d2
Revises: 8a82d54029e8
Create Date: 2026-09-15
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "91f0b7c3a6d2"
down_revision = "8a82d54029e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mfa_challenges",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "jti",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "max_attempts",
            sa.Integer(),
            server_default="5",
            nullable=False,
        ),
        sa.Column(
            "ip_address",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "user_agent",
            sa.String(length=1000),
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
        sa.UniqueConstraint("jti"),
    )

    op.create_index(
        "ix_mfa_challenges_id",
        "mfa_challenges",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_mfa_challenges_user_id",
        "mfa_challenges",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_mfa_challenges_jti",
        "mfa_challenges",
        ["jti"],
        unique=True,
    )

    op.create_index(
        "ix_mfa_challenges_expires_at",
        "mfa_challenges",
        ["expires_at"],
        unique=False,
    )

    op.create_index(
        "ix_mfa_challenges_used_at",
        "mfa_challenges",
        ["used_at"],
        unique=False,
    )

    op.create_index(
        "ix_mfa_challenges_revoked_at",
        "mfa_challenges",
        ["revoked_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mfa_challenges_revoked_at",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_used_at",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_expires_at",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_jti",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_user_id",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_id",
        table_name="mfa_challenges",
    )

    op.drop_table("mfa_challenges")