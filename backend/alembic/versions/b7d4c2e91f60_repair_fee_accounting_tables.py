
"""Safely create missing fee payment and accounting tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "b7d4c2e91f60"
down_revision = "add_fee_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Create only missing tables. Never drop or replace existing tables.
    inspector = inspect(bind)
    existing = set(inspector.get_table_names(schema="public"))

    if "fee_payments" not in existing:
        op.create_table(
            "fee_payments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "school_id",
                sa.Integer(),
                sa.ForeignKey("schools.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "academic_session_id",
                sa.Integer(),
                sa.ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.Integer(),
                sa.ForeignKey("students.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "student_fee_plan_id",
                sa.Integer(),
                sa.ForeignKey("student_fee_plans.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "installment_id",
                sa.Integer(),
                sa.ForeignKey(
                    "student_fee_plan_installments.id",
                    ondelete="RESTRICT",
                ),
                nullable=True,
            ),
            sa.Column("receipt_number", sa.String(100), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("payment_date", sa.Date(), nullable=False),
            sa.Column(
                "payment_mode",
                sa.String(30),
                nullable=False,
                server_default="cash",
            ),
            sa.Column("reference_number", sa.String(150)),
            sa.Column("remarks", sa.Text()),
            sa.Column(
                "status",
                sa.String(20),
                nullable=False,
                server_default="posted",
            ),
            sa.Column("idempotency_key", sa.String(100)),
            sa.Column(
                "reverses_payment_id",
                sa.Integer(),
                sa.ForeignKey("fee_payments.id", ondelete="RESTRICT"),
            ),
            sa.Column("reversal_reason", sa.Text()),
            sa.Column(
                "received_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column("reversed_at", sa.DateTime(timezone=True)),
            sa.CheckConstraint(
                "amount > 0",
                name="ck_fee_payment_amount_positive",
            ),
            sa.CheckConstraint(
                "payment_mode IN "
                "('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')",
                name="ck_fee_payment_mode",
            ),
            sa.CheckConstraint(
                "status IN ('posted', 'reversed')",
                name="ck_fee_payment_status",
            ),
            sa.UniqueConstraint(
                "school_id",
                "academic_session_id",
                "receipt_number",
                name="uq_fee_payment_receipt",
            ),
            sa.UniqueConstraint(
                "school_id",
                "academic_session_id",
                "idempotency_key",
                name="uq_fee_payment_idempotency",
            ),
            sa.UniqueConstraint(
                "reverses_payment_id",
                name="uq_fee_payment_reversal_reference",
            ),
            schema="public",
        )

        for name, columns in (
            ("ix_fee_payments_school_id", ["school_id"]),
            ("ix_fee_payments_academic_session_id", ["academic_session_id"]),
            ("ix_fee_payments_student_id", ["student_id"]),
            ("ix_fee_payments_student_fee_plan_id", ["student_fee_plan_id"]),
            ("ix_fee_payments_installment_id", ["installment_id"]),
            (
                "ix_fee_payments_school_session_date",
                ["school_id", "academic_session_id", "payment_date"],
            ),
            ("ix_fee_payments_student_date", ["student_id", "payment_date"]),
        ):
            op.create_index(
                name,
                "fee_payments",
                columns,
                schema="public",
            )

    if "accounting_transactions" not in existing:
        op.create_table(
            "accounting_transactions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "school_id",
                sa.Integer(),
                sa.ForeignKey("schools.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column(
                "academic_session_id",
                sa.Integer(),
                sa.ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column("transaction_type", sa.String(20), nullable=False),
            sa.Column("category", sa.String(100), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("transaction_date", sa.Date(), nullable=False),
            sa.Column("payment_mode", sa.String(30)),
            sa.Column("reference_number", sa.String(100)),
            sa.Column("description", sa.Text()),
            sa.Column("source_type", sa.String(50), nullable=False),
            sa.Column("source_id", sa.String(100), nullable=False),
            sa.Column(
                "status",
                sa.String(20),
                nullable=False,
                server_default="posted",
            ),
            sa.Column(
                "created_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
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
            sa.CheckConstraint(
                "amount > 0",
                name="ck_accounting_transactions_amount_positive",
            ),
            sa.CheckConstraint(
                "transaction_type IN ('income', 'expense')",
                name="ck_accounting_transactions_type",
            ),
            sa.CheckConstraint(
                "status IN ('posted', 'voided')",
                name="ck_accounting_transactions_status",
            ),
            sa.UniqueConstraint(
                "school_id",
                "academic_session_id",
                "source_type",
                "source_id",
                "transaction_type",
                name="uq_accounting_transaction_source",
            ),
            schema="public",
        )

        op.create_index(
            "ix_accounting_transactions_school_session",
            "accounting_transactions",
            ["school_id", "academic_session_id"],
            schema="public",
        )
        op.create_index(
            "ix_accounting_transactions_date",
            "accounting_transactions",
            ["school_id", "transaction_date"],
            schema="public",
        )
        op.create_index(
            "ix_accounting_transactions_type_status",
            "accounting_transactions",
            ["school_id", "transaction_type", "status"],
            schema="public",
        )


def downgrade() -> None:
    # Intentionally non-destructive.
    # Preserve school financial records during rollback.
    pass
