from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.accounting_transaction import AccountingTransaction


router = APIRouter(
    prefix="/accounting-transactions",
    tags=["Accounting Transactions"],
)


class AccountingTransactionCreate(BaseModel):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)
    transaction_type: str = Field(pattern="^(income|expense)$")
    category: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
    transaction_date: date
    payment_mode: str | None = Field(default=None, max_length=30)
    reference_number: str | None = Field(default=None, max_length=100)
    description: str = Field(min_length=1, max_length=4000)


class AccountingTransactionVoid(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


def _transaction_dict(transaction: AccountingTransaction) -> dict:
    return {
        "id": transaction.id,
        "school_id": transaction.school_id,
        "academic_session_id": transaction.academic_session_id,
        "transaction_type": transaction.transaction_type,
        "category": transaction.category,
        "amount": transaction.amount,
        "transaction_date": transaction.transaction_date,
        "payment_mode": transaction.payment_mode,
        "reference_number": transaction.reference_number,
        "description": transaction.description,
        "source_type": transaction.source_type,
        "source_id": transaction.source_id,
        "status": transaction.status,
        "created_by": transaction.created_by,
        "created_at": transaction.created_at,
        "updated_at": transaction.updated_at,
    }


@router.get("", response_model=list[dict])
def list_accounting_transactions(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    transaction_type: str | None = Query(default=None, pattern="^(income|expense)$"),
    transaction_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(posted|voided)$",
    ),
    source_type: str | None = Query(default=None, max_length=50),
    category: str | None = Query(default=None, max_length=100),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=1000, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("FEE_PAYMENT_VIEW")),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from cannot be after date_to.",
        )

    query = db.query(AccountingTransaction).filter(
        AccountingTransaction.school_id == school_id,
        AccountingTransaction.academic_session_id == academic_session_id,
    )

    if transaction_type:
        query = query.filter(
            AccountingTransaction.transaction_type == transaction_type
        )
    if transaction_status:
        query = query.filter(AccountingTransaction.status == transaction_status)
    if source_type:
        query = query.filter(AccountingTransaction.source_type == source_type)
    if category:
        query = query.filter(AccountingTransaction.category == category)
    if date_from:
        query = query.filter(AccountingTransaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(AccountingTransaction.transaction_date <= date_to)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AccountingTransaction.category.ilike(term),
                AccountingTransaction.description.ilike(term),
                AccountingTransaction.reference_number.ilike(term),
                AccountingTransaction.source_type.ilike(term),
                AccountingTransaction.source_id.ilike(term),
            )
        )

    rows = (
        query.order_by(
            AccountingTransaction.transaction_date.desc(),
            AccountingTransaction.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_transaction_dict(row) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_accounting_transaction(
    payload: AccountingTransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("FEE_PAYMENT_CREATE")),
):
    category = payload.category.strip()
    description = payload.description.strip()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category is required.",
        )
    if not description:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description is required.",
        )

    transaction = AccountingTransaction(
        school_id=payload.school_id,
        academic_session_id=payload.academic_session_id,
        transaction_type=payload.transaction_type,
        category=category,
        amount=payload.amount.quantize(Decimal("0.01")),
        transaction_date=payload.transaction_date,
        payment_mode=(payload.payment_mode.strip() or None)
        if payload.payment_mode
        else None,
        reference_number=(payload.reference_number.strip() or None)
        if payload.reference_number
        else None,
        description=description,
        source_type="manual",
        # The model requires a source id and has a unique constraint on it.
        # A UUID gives every manual entry its own stable source identity.
        source_id=uuid4().hex,
        status="posted",
        created_by=getattr(current_user, "id", None),
    )

    try:
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Could not save this transaction. Check that the school and "
                "academic session exist and that the amount is valid."
            ),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Accounting transaction could not be saved.",
        ) from exc

    return _transaction_dict(transaction)


@router.post("/{transaction_id}/void", response_model=dict)
def void_accounting_transaction(
    transaction_id: int,
    payload: AccountingTransactionVoid,
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("FEE_PAYMENT_CREATE")),
):
    reason = payload.reason.strip()
    if len(reason) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Void reason must contain at least 5 non-space characters.",
        )

    transaction = (
        db.query(AccountingTransaction)
        .filter(
            AccountingTransaction.id == transaction_id,
            AccountingTransaction.school_id == school_id,
            AccountingTransaction.academic_session_id == academic_session_id,
        )
        .first()
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accounting transaction not found for the selected school and session.",
        )
    if transaction.source_type != "manual":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "System-generated entries must be corrected in their source module; "
                "only manual accounting entries can be voided here."
            ),
        )
    if transaction.status != "posted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This accounting transaction is already voided.",
        )

    # This existing model has no dedicated void_reason column. Preserve the
    # original description and append the reason so the existing schema can
    # retain the audit context without requiring a migration in this step.
    original_description = (transaction.description or "").strip()
    reason_note = f"Void reason: {reason}"
    transaction.description = (
        f"{original_description}\n{reason_note}".strip()
        if original_description
        else reason_note
    )
    transaction.status = "voided"

    try:
        db.commit()
        db.refresh(transaction)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Accounting transaction could not be voided.",
        ) from exc

    return _transaction_dict(transaction)
