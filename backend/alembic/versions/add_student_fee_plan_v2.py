"""add student fee plan v2 fields and installments

Revision ID: add_student_fee_plan_v2
Revises: add_student_fee_plans
"""

from alembic import op
import sqlalchemy as sa


revision = "add_student_fee_plan_v2"
down_revision = "add_student_fee_plans"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "student_fee_plans",
        sa.Column(
            "gross_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "student_fee_plans",
        sa.Column(
            "item_discount_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "student_fee_plans",
        sa.Column(
            "plan_discount_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "student_fee_plans",
        sa.Column(
            "net_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "student_fee_plans",
        sa.Column(
            "installment_mode",
            sa.String(length=20),
            nullable=False,
            server_default="single",
        ),
    )

    op.add_column(
        "student_fee_plans",
        sa.Column(
            "installment_count",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    op.add_column(
        "student_fee_plan_items",
        sa.Column(
            "item_discount_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "student_fee_plan_items",
        sa.Column(
            "payable_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.create_table(
        "student_fee_plan_installments",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),
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
            "installment_number",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "due_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(12, 2),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
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
            "installment_number",
            name="uq_student_fee_plan_installment_number",
        ),
    )

    op.create_index(
        "ix_student_fee_plan_installments_plan_id",
        "student_fee_plan_installments",
        ["student_fee_plan_id"],
    )


def downgrade():
    op.drop_index(
        "ix_student_fee_plan_installments_plan_id",
        table_name="student_fee_plan_installments",
    )

    op.drop_table(
        "student_fee_plan_installments"
    )

    op.drop_column(
        "student_fee_plan_items",
        "payable_amount",
    )

    op.drop_column(
        "student_fee_plan_items",
        "item_discount_amount",
    )

    op.drop_column(
        "student_fee_plans",
        "installment_count",
    )

    op.drop_column(
        "student_fee_plans",
        "installment_mode",
    )

    op.drop_column(
        "student_fee_plans",
        "net_amount",
    )

    op.drop_column(
        "student_fee_plans",
        "plan_discount_amount",
    )

    op.drop_column(
        "student_fee_plans",
        "item_discount_amount",
    )

    op.drop_column(
        "student_fee_plans",
        "gross_amount",
    )