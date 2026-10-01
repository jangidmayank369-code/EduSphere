from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    # ------------------------------------------------------------------
    # School Identity
    # ------------------------------------------------------------------

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Contact Information
    # ------------------------------------------------------------------

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
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

    website: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Affiliation / Registration
    # ------------------------------------------------------------------

    affiliation: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    affiliation_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    registration_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    recognition_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    udise_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    school_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    management_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    established_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Tax / Financial Identity
    # ------------------------------------------------------------------

    pan_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    tan_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    gst_number: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # School Leadership
    # ------------------------------------------------------------------

    principal_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    principal_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    principal_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Branding
    # ------------------------------------------------------------------

    logo_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    favicon_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    primary_color: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    secondary_color: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    tagline: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Academic Configuration
    # ------------------------------------------------------------------

    academic_year_start_month: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=4,
    )

    academic_year_end_month: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
    )

    grading_system: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    attendance_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    working_days_per_week: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # School Status
    # ------------------------------------------------------------------

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------

    academic_sessions: Mapped[
        list["AcademicSession"]
    ] = relationship(
        back_populates="school",
        cascade="all, delete-orphan",
    )

    students: Mapped[list["Student"]] = relationship(
        back_populates="school",
        cascade="all, delete-orphan",
    )

    parents: Mapped[list["Parent"]] = relationship(
        back_populates="school",
        cascade="all, delete-orphan",
    )

    admissions: Mapped[list["Admission"]] = relationship(
        back_populates="school",
        cascade="all, delete-orphan",
    )


class AcademicSession(Base):
    __tablename__ = "academic_sessions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    school_id: Mapped[int] = mapped_column(
        ForeignKey(
            "schools.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ------------------------------------------------------------------
    # Session Identity
    # ------------------------------------------------------------------

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Session Lifecycle
    # ------------------------------------------------------------------

    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    is_closed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Carry-forward / Clone Tracking
    # ------------------------------------------------------------------

    cloned_from_session_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "academic_sessions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    carried_forward_from_session_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "academic_sessions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------

    school: Mapped[School] = relationship(
        back_populates="academic_sessions",
    )

    students: Mapped[
        list["Student"]
    ] = relationship(
        back_populates="academic_session",
    )

    admissions: Mapped[
        list["Admission"]
    ] = relationship(
        back_populates="academic_session",
        cascade="all, delete-orphan",
    )

    cloned_from_session: Mapped[
        "AcademicSession | None"
    ] = relationship(
        "AcademicSession",
        foreign_keys=[cloned_from_session_id],
        remote_side=[id],
        back_populates="cloned_sessions",
    )

    cloned_sessions: Mapped[
        list["AcademicSession"]
    ] = relationship(
        "AcademicSession",
        foreign_keys=[cloned_from_session_id],
        back_populates="cloned_from_session",
    )

    carried_forward_from_session: Mapped[
        "AcademicSession | None"
    ] = relationship(
        "AcademicSession",
        foreign_keys=[carried_forward_from_session_id],
        remote_side=[id],
        back_populates="carried_forward_sessions",
    )

    carried_forward_sessions: Mapped[
        list["AcademicSession"]
    ] = relationship(
        "AcademicSession",
        foreign_keys=[carried_forward_from_session_id],
        back_populates="carried_forward_from_session",
    )