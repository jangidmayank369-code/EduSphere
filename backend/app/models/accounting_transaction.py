
from __future__ import annotations

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


class AccountingTransaction(Base):
    __tablename__ = "accounting_transactions"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_accounting_transactions_amount_positive",
        ),
        CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name="ck_accounting_transactions_type",
        ),
        CheckConstraint(
            "status IN ('posted', 'voided')",
            name="ck_accounting_transactions_status",
        ),
        UniqueConstraint(
            "school_id",
            "academic_session_id",
            "source_type",
            "source_id",
            "transaction_type",
            name="uq_accounting_transaction_source",
        ),
        Index(
            "ix_accounting_transactions_school_session",
            "school_id",
            "academic_session_id",
        ),
        Index(
            "ix_accounting_transactions_date",
            "school_id",
            "transaction_date",
        ),
        Index(
            "ix_accounting_transactions_type_status",
            "school_id",
            "transaction_type",
            "status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="RESTRICT"),
        nullable=False,
    )

    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
        nullable=False,
    )

    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    transaction_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    payment_mode: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    reference_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    source_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="posted",
        server_default="posted",
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )