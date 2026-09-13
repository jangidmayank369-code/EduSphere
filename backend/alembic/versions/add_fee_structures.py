"""add fee structures

Revision ID: add_fee_structures
Revises: add_admissions
Create Date: 2026-09-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_fee_structures"
down_revision: Union[str, None] = "add_admissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fee_structures",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "school_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "academic_session_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(length=150),
            nullable=False,
        ),

        sa.Column(
            "fee_head",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "class_name",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "frequency",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(
                precision=12,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "due_day",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "effective_from",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "effective_to",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "is_optional",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            name="fk_fee_structures_school_id",
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["academic_session_id"],
            ["academic_sessions.id"],
            name="fk_fee_structures_session_id",
            ondelete="RESTRICT",
        ),

        sa.UniqueConstraint(
            "school_id",
            "academic_session_id",
            "class_name",
            "fee_head",
            "frequency",
            "name",
            name="uq_fee_structure_scope",
        ),
    )

    op.create_index(
        "ix_fee_structures_school_id",
        "fee_structures",
        ["school_id"],
    )

    op.create_index(
        "ix_fee_structures_session_id",
        "fee_structures",
        ["academic_session_id"],
    )

    op.create_index(
        "ix_fee_structures_class_name",
        "fee_structures",
        ["class_name"],
    )

    op.create_index(
        "ix_fee_structures_fee_head",
        "fee_structures",
        ["fee_head"],
    )

    op.create_index(
        "ix_fee_structures_active",
        "fee_structures",
        ["is_active"],
    )

    op.create_index(
        "ix_fee_structures_effective_dates",
        "fee_structures",
        ["effective_from", "effective_to"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_fee_structures_effective_dates",
        table_name="fee_structures",
    )

    op.drop_index(
        "ix_fee_structures_active",
        table_name="fee_structures",
    )

    op.drop_index(
        "ix_fee_structures_fee_head",
        table_name="fee_structures",
    )

    op.drop_index(
        "ix_fee_structures_class_name",
        table_name="fee_structures",
    )

    op.drop_index(
        "ix_fee_structures_session_id",
        table_name="fee_structures",
    )

    op.drop_index(
        "ix_fee_structures_school_id",
        table_name="fee_structures",
    )

    op.drop_table("fee_structures")