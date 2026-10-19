
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[int] = mapped_column(primary_key=True)

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    student_fee_plan_id: Mapped[int] = mapped_column(
        ForeignKey("student_fee_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    installment_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "student_fee_plan_installments.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    receipt_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    payment_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    payment_mode: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="cash",
    )

    reference_number: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="posted",
    )

    idempotency_key: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    reverses_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("fee_payments.id", ondelete="RESTRICT"),
        nullable=True,
    )

    reversal_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    received_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    reversed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_fee_payment_amount_positive",
        ),
        CheckConstraint(
            "payment_mode IN "
            "('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')",
            name="ck_fee_payment_mode",
        ),
        CheckConstraint(
            "status IN ('posted', 'reversed')",
            name="ck_fee_payment_status",
        ),
        UniqueConstraint(
            "school_id",
            "academic_session_id",
            "receipt_number",
            name="uq_fee_payment_receipt",
        ),
        UniqueConstraint(
            "school_id",
            "academic_session_id",
            "idempotency_key",
            name="uq_fee_payment_idempotency",
        ),
        UniqueConstraint(
            "reverses_payment_id",
            name="uq_fee_payment_reversal_reference",
        ),
        Index(
            "ix_fee_payments_school_session_date",
            "school_id",
            "academic_session_id",
            "payment_date",
        ),
        Index(
            "ix_fee_payments_student_date",
            "student_id",
            "payment_date",
        ),
    )
