from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Admission(Base):
    __tablename__ = "admissions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    school_id: Mapped[int] = mapped_column(
        ForeignKey(
            "schools.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey(
            "academic_sessions.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    application_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    admission_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="enquiry",
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    middle_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    last_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    blood_group: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    class_applied: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    previous_school: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    previous_class: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    parent_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    parent_relationship: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    parent_phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    parent_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    state: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="India",
    )

    postal_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    enquiry_source: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    confirmed_student_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "students.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    school = relationship(
        "School",
        back_populates="admissions",
    )

    academic_session = relationship(
        "AcademicSession",
        back_populates="admissions",
    )

    confirmed_student = relationship(
        "Student",
        foreign_keys=[confirmed_student_id],
    )