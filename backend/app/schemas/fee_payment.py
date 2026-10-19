
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


PaymentMode = Literal[
    "cash",
    "upi",
    "bank_transfer",
    "card",
    "cheque",
    "other",
]


class FeePaymentCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)
    student_id: int = Field(gt=0)
    student_fee_plan_id: int = Field(gt=0)
    installment_id: int | None = Field(default=None, gt=0)

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    payment_date: date

    payment_mode: PaymentMode = "cash"

    reference_number: str | None = Field(
        default=None,
        max_length=150,
    )

    remarks: str | None = Field(
        default=None,
        max_length=4000,
    )

    idempotency_key: str | None = Field(
        default=None,
        max_length=100,
    )

    @field_validator(
        "reference_number",
        "remarks",
        "idempotency_key",
    )
    @classmethod
    def strip_optional_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


class FeePaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    academic_session_id: int
    student_id: int
    student_fee_plan_id: int
    installment_id: int | None

    receipt_number: str
    amount: Decimal
    payment_date: date
    payment_mode: str

    reference_number: str | None
    remarks: str | None
    status: str
    idempotency_key: str | None

    reverses_payment_id: int | None
    reversal_reason: str | None

    received_by: int | None
    created_at: datetime
    reversed_at: datetime | None


class FeePaymentReversalCreate(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=1000,
    )

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 3:
            raise ValueError(
                "Reversal reason must contain at least 3 characters"
            )

        return value
