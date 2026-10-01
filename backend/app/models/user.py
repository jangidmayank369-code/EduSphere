from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.rbac import user_roles


if TYPE_CHECKING:
    from app.models.email_otp import EmailOTP
    from app.models.mfa import UserMFA
    from app.models.mfa_challenge import MFAChallenge
    from app.models.session import UserSession


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # Sessions
    # ========================================================

    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # Authenticator MFA
    # ========================================================

    mfa: Mapped["UserMFA | None"] = relationship(
        "UserMFA",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # ========================================================
    # MFA Login Challenges
    # ========================================================

    mfa_challenges: Mapped[list["MFAChallenge"]] = relationship(
        "MFAChallenge",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # Email OTP
    # ========================================================

    email_otps: Mapped[list["EmailOTP"]] = relationship(
        "EmailOTP",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # RBAC
    # ========================================================

    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
    )