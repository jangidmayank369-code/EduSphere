"""Add accounting idempotency keys without changing existing transactions.

Revision ID: 20261019_acct_safe
Revises: e21b9805cb83
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261019_acct_safe"
down_revision = "e21b9805cb83"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "accounting_transactions" not in inspector.get_table_names(schema="public"):
        # On non-PostgreSQL test/dev databases, schema may be reported as None.
        if "accounting_transactions" not in inspector.get_table_names():
            raise RuntimeError(
                "accounting_transactions table is missing; refusing to create or reset financial tables automatically."
            )
        schema = None
    else:
        schema = "public"

    columns = {
        column["name"]
        for column in inspect(bind).get_columns("accounting_transactions", schema=schema)
    }
    if "idempotency_key" not in columns:
        op.add_column(
            "accounting_transactions",
            sa.Column("idempotency_key", sa.String(length=100), nullable=True),
            schema=schema,
        )

    constraints = {
        item.get("name")
        for item in inspect(bind).get_unique_constraints(
            "accounting_transactions", schema=schema
        )
    }
    if "uq_accounting_transaction_idempotency" not in constraints:
        op.create_unique_constraint(
            "uq_accounting_transaction_idempotency",
            "accounting_transactions",
            ["school_id", "academic_session_id", "idempotency_key"],
            schema=schema,
        )


def downgrade() -> None:
    # Intentionally non-destructive: do not remove a column or constraint that
    # may already contain live idempotency data.
    pass
