from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_FREQUENCIES = {
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
    "one_time",
}


class FeeStructureCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)

    name: str = Field(min_length=2, max_length=150)
    fee_head: str = Field(min_length=2, max_length=100)

    class_name: str | None = Field(
        default=None,
        max_length=100,
    )

    frequency: str = Field(
        default="monthly",
        min_length=3,
        max_length=30,
    )

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    due_day: int | None = Field(
        default=None,
        ge=1,
        le=31,
    )

    effective_from: date
    effective_to: date | None = None

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    is_optional: bool = False
    is_active: bool = True

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, value: str) -> str:
        value = value.strip().lower()

        if value not in VALID_FREQUENCIES:
            raise ValueError(
                "Invalid frequency. Allowed values: "
                "monthly, quarterly, half_yearly, yearly, one_time."
            )

        return value

    @field_validator("fee_head", "name")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value


class FeeStructureUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    fee_head: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    class_name: str | None = Field(
        default=None,
        max_length=100,
    )

    frequency: str | None = Field(
        default=None,
        min_length=3,
        max_length=30,
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    due_day: int | None = Field(
        default=None,
        ge=1,
        le=31,
    )

    effective_from: date | None = None
    effective_to: date | None = None

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    is_optional: bool | None = None
    is_active: bool | None = None

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        if value not in VALID_FREQUENCIES:
            raise ValueError(
                "Invalid frequency. Allowed values: "
                "monthly, quarterly, half_yearly, yearly, one_time."
            )

        return value

    @field_validator("fee_head", "name")
    @classmethod
    def normalize_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value


class FeeStructureStatusUpdate(BaseModel):
    is_active: bool


class FeeStructureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    school_id: int
    academic_session_id: int

    name: str
    fee_head: str
    class_name: str | None

    frequency: str
    amount: Decimal

    due_day: int | None

    effective_from: date
    effective_to: date | None

    description: str | None

    is_optional: bool
    is_active: bool

    created_at: datetime
    updated_at: datetime


class FeeStructureListResponse(BaseModel):
    success: bool = True
    data: list[FeeStructureResponse]
    meta: dict