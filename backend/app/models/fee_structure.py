from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    __table_args__ = (
        UniqueConstraint(
            "school_id",
            "academic_session_id",
            "class_name",
            "fee_head",
            "frequency",
            "name",
            name="uq_fee_structure_scope",
        ),
        Index("ix_fee_structures_school_id", "school_id"),
        Index("ix_fee_structures_session_id", "academic_session_id"),
        Index("ix_fee_structures_class_name", "class_name"),
        Index("ix_fee_structures_fee_head", "fee_head"),
        Index("ix_fee_structures_active", "is_active"),
        Index("ix_fee_structures_effective_dates", "effective_from", "effective_to"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
    )

    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    fee_head: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    class_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    frequency: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="monthly",
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    due_day: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    effective_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    effective_to: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_optional: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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

    school = relationship("School")
    academic_session = relationship("AcademicSession")