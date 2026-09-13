"""add student fee plans

Revision ID: add_student_fee_plans
Revises: add_fee_structures
"""

from alembic import op
import sqlalchemy as sa


revision = "add_student_fee_plans"
down_revision = "add_fee_structures"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "student_fee_plans",
        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "school_id",
            sa.Integer(),
            sa.ForeignKey(
                "schools.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey(
                "students.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "academic_session_id",
            sa.Integer(),
            sa.ForeignKey(
                "academic_sessions.id",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(length=150),
            nullable=False,
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
            "discount_type",
            sa.String(length=20),
            nullable=False,
            server_default="none",
        ),

        sa.Column(
            "discount_value",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "scholarship_name",
            sa.String(length=150),
            nullable=True,
        ),

        sa.Column(
            "concession_reason",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.UniqueConstraint(
            "student_id",
            "academic_session_id",
            name="uq_student_fee_plan_student_session",
        ),
    )

    op.create_index(
        "ix_student_fee_plans_school_id",
        "student_fee_plans",
        ["school_id"],
    )

    op.create_index(
        "ix_student_fee_plans_student_id",
        "student_fee_plans",
        ["student_id"],
    )

    op.create_index(
        "ix_student_fee_plans_academic_session_id",
        "student_fee_plans",
        ["academic_session_id"],
    )

    op.create_table(
        "student_fee_plan_items",
        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "student_fee_plan_id",
            sa.Integer(),
            sa.ForeignKey(
                "student_fee_plans.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "fee_structure_id",
            sa.Integer(),
            sa.ForeignKey(
                "fee_structures.id",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(12, 2),
            nullable=False,
        ),

        sa.Column(
            "custom_amount",
            sa.Numeric(12, 2),
            nullable=True,
        ),

        sa.Column(
            "item_discount_type",
            sa.String(length=20),
            nullable=False,
            server_default="none",
        ),

        sa.Column(
            "item_discount_value",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "is_optional",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "is_selected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.UniqueConstraint(
            "student_fee_plan_id",
            "fee_structure_id",
            name="uq_student_fee_plan_fee_structure",
        ),
    )

    op.create_index(
        "ix_student_fee_plan_items_plan_id",
        "student_fee_plan_items",
        ["student_fee_plan_id"],
    )

    op.create_index(
        "ix_student_fee_plan_items_fee_structure_id",
        "student_fee_plan_items",
        ["fee_structure_id"],
    )


def downgrade():
    op.drop_index(
        "ix_student_fee_plan_items_fee_structure_id",
        table_name="student_fee_plan_items",
    )

    op.drop_index(
        "ix_student_fee_plan_items_plan_id",
        table_name="student_fee_plan_items",
    )

    op.drop_table("student_fee_plan_items")

    op.drop_index(
        "ix_student_fee_plans_academic_session_id",
        table_name="student_fee_plans",
    )

    op.drop_index(
        "ix_student_fee_plans_student_id",
        table_name="student_fee_plans",
    )

    op.drop_index(
        "ix_student_fee_plans_school_id",
        table_name="student_fee_plans",
    )

    op.drop_table("student_fee_plans")