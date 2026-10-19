
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing_extensions import Annotated


TransactionType = Literal["income", "expense"]
TransactionStatus = Literal["posted", "voided"]

ShortText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]

DescriptionText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=2000),
]


class AccountingTransactionCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)

    transaction_type: TransactionType
    category: ShortText
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date

    payment_mode: str | None = Field(default=None, max_length=30)
    reference_number: str | None = Field(default=None, max_length=100)
    description: DescriptionText | None = None

    source_type: ShortText
    source_id: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
    ]


class AccountingTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    academic_session_id: int
    transaction_type: TransactionType
    category: str
    amount: Decimal
    transaction_date: date
    payment_mode: str | None
    reference_number: str | None
    description: str | None
    source_type: str
    source_id: str
    status: TransactionStatus
    created_by: int | None
    created_at: datetime
    updated_at: datetime


class AccountingTransactionListResponse(BaseModel):
    success: bool = True
    data: list[AccountingTransactionResponse]
    meta: dict[str, int]


class AccountingSummaryResponse(BaseModel):
    school_id: int
    academic_session_id: int
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int
