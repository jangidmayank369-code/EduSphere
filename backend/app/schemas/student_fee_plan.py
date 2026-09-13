from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


DISCOUNT_TYPES = {"none", "percentage", "fixed"}
INSTALLMENT_MODES = {"single", "equal", "custom"}


class StudentFeePlanItemCreate(BaseModel):
    fee_structure_id: int = Field(gt=0)
    custom_amount: Decimal | None = Field(default=None, ge=0)
    item_discount_type: str = "none"
    item_discount_value: Decimal = Field(default=Decimal("0.00"), ge=0)
    is_selected: bool = True
    notes: str | None = None

    @model_validator(mode="after")
    def validate_discount(self):
        if self.item_discount_type not in DISCOUNT_TYPES:
            raise ValueError("Invalid item discount type.")

        if (
            self.item_discount_type == "percentage"
            and self.item_discount_value > 100
        ):
            raise ValueError("Percentage discount cannot exceed 100.")

        return self


class StudentFeePlanInstallmentCreate(BaseModel):
    installment_number: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=100)
    due_date: date
    amount: Decimal = Field(gt=0)


class StudentFeePlanCreate(BaseModel):
    school_id: int = Field(gt=0)
    student_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)

    name: str = Field(min_length=1, max_length=150)

    effective_from: date
    effective_to: date | None = None

    discount_type: str = "none"
    discount_value: Decimal = Field(default=Decimal("0.00"), ge=0)

    scholarship_name: str | None = None
    concession_reason: str | None = None
    notes: str | None = None

    is_active: bool = True

    installment_mode: str = "single"
    installment_count: int = Field(default=1, ge=1, le=24)

    items: list[StudentFeePlanItemCreate] = Field(min_length=1)
    installments: list[StudentFeePlanInstallmentCreate] | None = None

    @model_validator(mode="after")
    def validate_plan(self):
        if self.discount_type not in DISCOUNT_TYPES:
            raise ValueError("Invalid discount type.")

        if (
            self.discount_type == "percentage"
            and self.discount_value > 100
        ):
            raise ValueError("Percentage discount cannot exceed 100.")

        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be before effective_from.")

        if self.installment_mode not in INSTALLMENT_MODES:
            raise ValueError("Invalid installment mode.")

        if self.installment_mode == "single" and self.installment_count != 1:
            raise ValueError(
                "Single installment mode requires installment_count=1."
            )

        if self.installment_mode == "custom":
            if not self.installments:
                raise ValueError(
                    "Custom installment mode requires installments."
                )
            if len(self.installments) != self.installment_count:
                raise ValueError(
                    "Number of custom installments must match installment_count."
                )

        if self.installment_mode == "equal" and self.installments:
            raise ValueError(
                "Equal installment mode does not accept custom installments."
            )

        return self


class StudentFeePlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)

    effective_from: date | None = None
    effective_to: date | None = None

    discount_type: str | None = None
    discount_value: Decimal | None = Field(default=None, ge=0)

    scholarship_name: str | None = None
    concession_reason: str | None = None
    notes: str | None = None

    installment_mode: str | None = None
    installment_count: int | None = Field(default=None, ge=1, le=24)

    items: list[StudentFeePlanItemCreate] | None = None
    installments: list[StudentFeePlanInstallmentCreate] | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if (
            self.discount_type is not None
            and self.discount_type not in DISCOUNT_TYPES
        ):
            raise ValueError("Invalid discount type.")

        if (
            self.discount_type == "percentage"
            and self.discount_value is not None
            and self.discount_value > 100
        ):
            raise ValueError("Percentage discount cannot exceed 100.")

        if (
            self.installment_mode is not None
            and self.installment_mode not in INSTALLMENT_MODES
        ):
            raise ValueError("Invalid installment mode.")

        if (
            self.installment_mode == "single"
            and self.installment_count is not None
            and self.installment_count != 1
        ):
            raise ValueError(
                "Single installment mode requires installment_count=1."
            )

        if (
            self.installment_mode == "custom"
            and self.installments is not None
            and self.installment_count is not None
            and len(self.installments) != self.installment_count
        ):
            raise ValueError(
                "Number of custom installments must match installment_count."
            )

        if (
            self.installment_mode == "equal"
            and self.installments
        ):
            raise ValueError(
                "Equal installment mode does not accept custom installments."
            )

        return self


class StudentFeePlanStatusUpdate(BaseModel):
    is_active: bool


class StudentFeePlanInstallmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_fee_plan_id: int
    installment_number: int
    name: str
    due_date: date
    amount: Decimal
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StudentFeePlanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_fee_plan_id: int
    fee_structure_id: int
    amount: Decimal
    custom_amount: Decimal | None
    item_discount_type: str
    item_discount_value: Decimal
    item_discount_amount: Decimal
    payable_amount: Decimal
    is_optional: bool
    is_selected: bool
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StudentFeePlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    student_id: int
    academic_session_id: int
    name: str

    effective_from: date
    effective_to: date | None

    discount_type: str
    discount_value: Decimal

    scholarship_name: str | None
    concession_reason: str | None
    notes: str | None

    status: str
    is_active: bool

    gross_amount: Decimal
    item_discount_amount: Decimal
    plan_discount_amount: Decimal
    net_amount: Decimal

    installment_mode: str
    installment_count: int

    items: list[StudentFeePlanItemResponse] = Field(default_factory=list)
    installments: list[StudentFeePlanInstallmentResponse] = Field(
        default_factory=list
    )

    created_at: datetime
    updated_at: datetime


class StudentFeePlanListResponse(BaseModel):
    success: bool
    data: list[StudentFeePlanResponse]
    meta: dict


class BulkStudentFeePlanCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)

    student_ids: list[int] = Field(min_length=1)

    name: str = Field(min_length=1, max_length=150)

    effective_from: date
    effective_to: date | None = None

    discount_type: str = "none"
    discount_value: Decimal = Field(default=Decimal("0.00"), ge=0)

    scholarship_name: str | None = None
    concession_reason: str | None = None
    notes: str | None = None

    installment_mode: str = "single"
    installment_count: int = Field(default=1, ge=1, le=24)

    items: list[StudentFeePlanItemCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_bulk(self):
        if self.discount_type not in DISCOUNT_TYPES:
            raise ValueError("Invalid discount type.")

        if (
            self.discount_type == "percentage"
            and self.discount_value > 100
        ):
            raise ValueError("Percentage discount cannot exceed 100.")

        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be before effective_from.")

        if self.installment_mode not in INSTALLMENT_MODES:
            raise ValueError("Invalid installment mode.")

        if self.installment_mode == "single" and self.installment_count != 1:
            raise ValueError(
                "Single installment mode requires installment_count=1."
            )

        return self


class BulkStudentFeePlanResult(BaseModel):
    created_plan_ids: list[int]
    skipped_student_ids: list[int]
    failed_student_ids: list[int]
    total_requested: int
    total_created: int
