from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# ---------------------------------------------------------------------------
# Shared validators
# ---------------------------------------------------------------------------

def _normalize_name(value: str) -> str:
    normalized = " ".join(value.strip().split())

    if not normalized:
        raise ValueError("Full name cannot be empty.")

    return normalized


def _validate_password(value: str) -> str:
    # Do NOT strip passwords.
    # Spaces may intentionally be part of a user's password.
    if len(value) < 8:
        raise ValueError(
            "Password must contain at least 8 characters."
        )

    if len(value) > 128:
        raise ValueError(
            "Password cannot exceed 128 characters."
        )

    # Reject completely blank passwords while preserving intentional spaces.
    if not value.strip():
        raise ValueError(
            "Password cannot contain only whitespace."
        )

    return value


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr

    full_name: str = Field(
        min_length=1,
        max_length=200,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role_id: int = Field(
        gt=0,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> EmailStr:
        # EmailStr is already validated by Pydantic.
        # Return the normalized string; do not call EmailStr(...) as a constructor.
        return str(value).strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return _normalize_name(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

class UserUpdate(BaseModel):
    email: EmailStr | None = None

    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    role_id: int | None = Field(
        default=None,
        gt=0,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: EmailStr | None,
    ) -> EmailStr | None:
        if value is None:
            return None

        # EmailStr is already validated by Pydantic.
        return str(value).strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return _normalize_name(value)


# ---------------------------------------------------------------------------
# Password
# ---------------------------------------------------------------------------

class UserPasswordReset(BaseModel):
    password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

class UserStatusUpdate(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    email: EmailStr
    full_name: str
    is_active: bool

    role_id: int | None = None

    roles: list[str] = Field(
        default_factory=list,
    )

    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    email: EmailStr
    full_name: str
    is_active: bool

    role_id: int | None = None

    roles: list[str] = Field(
        default_factory=list,
    )