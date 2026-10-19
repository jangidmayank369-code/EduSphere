
"""Create the central accounting transactions table safely."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "add_accounting_transactions"
down_revision = "add_fee_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table(
        "accounting_transactions",
        schema="public",
    ):
        op.create_table(
            "accounting_transactions",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column(
                "school_id",
                sa.Integer(),
                sa.ForeignKey("schools.id", ondelete="RESTRICT"),
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
                "transaction_type",
                sa.String(length=20),
                nullable=False,
            ),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column(
                "amount",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
            ),
            sa.Column("transaction_date", sa.Date(), nullable=False),
            sa.Column("payment_mode", sa.String(length=30), nullable=True),
            sa.Column(
                "reference_number",
                sa.String(length=100),
                nullable=True,
            ),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("source_type", sa.String(length=50), nullable=False),
            sa.Column("source_id", sa.String(length=100), nullable=False),
            sa.Column(
                "status",
                sa.String(length=20),
                server_default="posted",
                nullable=False,
            ),
            sa.Column(
                "created_by",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
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

    existing_indexes = {
        index["name"]
        for index in inspect(bind).get_indexes(
            "accounting_transactions",
            schema="public",
        )
    }

    indexes = [
        (
            "ix_accounting_transactions_school_session",
            ["school_id", "academic_session_id"],
        ),
        (
            "ix_accounting_transactions_date",
            ["school_id", "transaction_date"],
        ),
        (
            "ix_accounting_transactions_type_status",
            ["school_id", "transaction_type", "status"],
        ),
    ]

    for index_name, columns in indexes:
        if index_name not in existing_indexes:
            op.create_index(
                index_name,
                "accounting_transactions",
                columns,
                schema="public",
            )


def downgrade() -> None:
    # Preserve existing financial data during rollback.
    pass
