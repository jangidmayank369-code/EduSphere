
"""Add fee payments and permissions."""

from alembic import op
import sqlalchemy as sa


revision = "add_fee_payments"
down_revision = "91f0b7c3a6d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
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
        sa.Column("reference_number", sa.String(150), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="posted",
        ),
        sa.Column("idempotency_key", sa.String(100), nullable=True),
        sa.Column(
            "reverses_payment_id",
            sa.Integer(),
            sa.ForeignKey("fee_payments.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column(
            "received_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
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
    )

    op.create_index(
        "ix_fee_payments_school_id",
        "fee_payments",
        ["school_id"],
    )
    op.create_index(
        "ix_fee_payments_academic_session_id",
        "fee_payments",
        ["academic_session_id"],
    )
    op.create_index(
        "ix_fee_payments_student_id",
        "fee_payments",
        ["student_id"],
    )
    op.create_index(
        "ix_fee_payments_student_fee_plan_id",
        "fee_payments",
        ["student_fee_plan_id"],
    )
    op.create_index(
        "ix_fee_payments_installment_id",
        "fee_payments",
        ["installment_id"],
    )
    op.create_index(
        "ix_fee_payments_school_session_date",
        "fee_payments",
        ["school_id", "academic_session_id", "payment_date"],
    )
    op.create_index(
        "ix_fee_payments_student_date",
        "fee_payments",
        ["student_id", "payment_date"],
    )

    permissions = sa.table(
        "permissions",
        sa.column("code", sa.String(150)),
        sa.column("description", sa.String(500)),
    )

    op.bulk_insert(
        permissions,
        [
            {
                "code": "FEE_PAYMENT_VIEW",
                "description": "View fee payments and receipts",
            },
            {
                "code": "FEE_PAYMENT_CREATE",
                "description": "Create fee payments",
            },
        ],
    )

    op.execute(
        """
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.name = 'Admin'
          AND p.code IN (
              'FEE_PAYMENT_VIEW',
              'FEE_PAYMENT_CREATE'
          )
        ON CONFLICT (role_id, permission_id) DO NOTHING
        """
    )


def downgrade() -> None:
    bind = op.get_bind()

    permission_ids = bind.execute(
        sa.text(
            """
            SELECT id
            FROM permissions
            WHERE code IN ('FEE_PAYMENT_VIEW', 'FEE_PAYMENT_CREATE')
            """
        )
    ).scalars().all()

    if permission_ids:
        bind.execute(
            sa.text(
                """
                DELETE FROM role_permissions
                WHERE permission_id IN :permission_ids
                """
            ).bindparams(
                sa.bindparam("permission_ids", expanding=True)
            ),
            {"permission_ids": permission_ids},
        )

        bind.execute(
            sa.text(
                """
                DELETE FROM permissions
                WHERE id IN :permission_ids
                """
            ).bindparams(
                sa.bindparam("permission_ids", expanding=True)
            ),
            {"permission_ids": permission_ids},
        )

    op.drop_index(
        "ix_fee_payments_student_date",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_school_session_date",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_installment_id",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_student_fee_plan_id",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_student_id",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_academic_session_id",
        table_name="fee_payments",
    )
    op.drop_index(
        "ix_fee_payments_school_id",
        table_name="fee_payments",
    )

    op.drop_table("fee_payments")
