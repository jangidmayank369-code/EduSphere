from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.accounting_transaction import AccountingTransaction
from app.models.audit import AuditLog
from app.models.fee_payment import FeePayment


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
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=100)


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
        "idempotency_key": transaction.idempotency_key,
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

    idempotency_key = payload.idempotency_key.strip() if payload.idempotency_key else None
    if idempotency_key:
        existing = (
            db.query(AccountingTransaction)
            .filter(
                AccountingTransaction.school_id == payload.school_id,
                AccountingTransaction.academic_session_id == payload.academic_session_id,
                AccountingTransaction.idempotency_key == idempotency_key,
            )
            .first()
        )
        if existing is not None:
            same_request = (
                existing.transaction_type == payload.transaction_type
                and existing.category == category
                and existing.amount == payload.amount.quantize(Decimal("0.01"))
                and existing.transaction_date == payload.transaction_date
                and existing.payment_mode == ((payload.payment_mode.strip() or None) if payload.payment_mode else None)
                and existing.reference_number == ((payload.reference_number.strip() or None) if payload.reference_number else None)
                and existing.description == description
                and existing.source_type == "manual"
            )
            if same_request and existing.status == "posted":
                return _transaction_dict(existing)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This idempotency key was already used for a different or voided transaction.",
            )

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
        idempotency_key=idempotency_key,
        status="posted",
        created_by=getattr(current_user, "id", None),
    )

    try:
        db.add(transaction)
        db.flush()
        db.add(AuditLog(
            actor_user_id=getattr(current_user, "id", None),
            action="CREATE",
            resource_type="ACCOUNTING_TRANSACTION",
            resource_id=str(transaction.id),
            details={
                "school_id": payload.school_id,
                "academic_session_id": payload.academic_session_id,
                "transaction_type": payload.transaction_type,
                "amount": str(transaction.amount),
                "category": category,
                "source_type": "manual",
                "idempotency_key": payload.idempotency_key,
            },
        ))
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
    old_status = transaction.status
    reason_note = f"Void reason: {reason}"
    transaction.description = (
        f"{original_description}\n{reason_note}".strip()
        if original_description
        else reason_note
    )
    transaction.status = "voided"

    try:
        db.add(AuditLog(
            actor_user_id=getattr(current_user, "id", None),
            action="VOID",
            resource_type="ACCOUNTING_TRANSACTION",
            resource_id=str(transaction.id),
            details={
                "school_id": school_id,
                "academic_session_id": academic_session_id,
                "old_status": old_status,
                "new_status": "voided",
                "reason": reason,
                "amount": str(transaction.amount),
                "transaction_type": transaction.transaction_type,
            },
        ))
        db.commit()
        db.refresh(transaction)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Accounting transaction could not be voided.",
        ) from exc

    return _transaction_dict(transaction)


@router.get("/reconciliation", response_model=dict)
def reconcile_fee_accounting(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("FEE_PAYMENT_VIEW")),
):
    """Compare original fee payments (including reversed ones) with linked income entries."""
    payments = (
        db.query(FeePayment)
        .filter(
            FeePayment.school_id == school_id,
            FeePayment.academic_session_id == academic_session_id,
            FeePayment.reverses_payment_id.is_(None),
        )
        .order_by(FeePayment.id.asc())
        .all()
    )
    discrepancies = []
    matched_count = 0
    payment_total = Decimal("0.00")
    accounting_total = Decimal("0.00")

    for payment in payments:
        amount = Decimal(str(payment.amount)).quantize(Decimal("0.01"))
        if payment.status == "posted":
            payment_total += amount
        expected_status = "posted" if payment.status == "posted" else "voided"
        entries = (
            db.query(AccountingTransaction)
            .filter(
                AccountingTransaction.school_id == school_id,
                AccountingTransaction.academic_session_id == academic_session_id,
                AccountingTransaction.source_type == "fee_payment",
                AccountingTransaction.source_id == str(payment.id),
                AccountingTransaction.transaction_type == "income",
            )
            .all()
        )
        issue = None
        if not entries:
            issue = "missing_accounting_entry"
        elif len(entries) > 1:
            issue = "duplicate_accounting_entries"
        else:
            entry = entries[0]
            entry_amount = Decimal(str(entry.amount)).quantize(Decimal("0.01"))
            if entry_amount != amount:
                issue = "amount_mismatch"
            elif entry.status != expected_status:
                issue = "status_mismatch"
            else:
                matched_count += 1
                if entry.status == "posted":
                    accounting_total += entry_amount
        if issue:
            discrepancies.append({
                "payment_id": payment.id,
                "receipt_number": payment.receipt_number,
                "payment_status": payment.status,
                "expected_accounting_status": expected_status,
                "payment_amount": str(amount),
                "accounting_transaction_ids": [entry.id for entry in entries],
                "accounting_amounts": [str(entry.amount) for entry in entries],
                "accounting_statuses": [entry.status for entry in entries],
                "issue": issue,
            })

    linked_posted_entries = (
        db.query(AccountingTransaction)
        .filter(
            AccountingTransaction.school_id == school_id,
            AccountingTransaction.academic_session_id == academic_session_id,
            AccountingTransaction.source_type == "fee_payment",
            AccountingTransaction.transaction_type == "income",
            AccountingTransaction.status == "posted",
        )
        .all()
    )
    original_payment_ids = {str(payment.id) for payment in payments}
    orphan_entries = [
        {
            "accounting_transaction_id": entry.id,
            "source_id": entry.source_id,
            "amount": str(entry.amount),
        }
        for entry in linked_posted_entries
        if entry.source_id not in original_payment_ids
    ]
    return {
        "school_id": school_id,
        "academic_session_id": academic_session_id,
        "status": "matched" if not discrepancies and not orphan_entries else "discrepancies_found",
        "original_payments_checked": len(payments),
        "matched_payments": matched_count,
        "posted_fee_payment_total": str(payment_total.quantize(Decimal("0.01"))),
        "matched_posted_accounting_total": str(accounting_total.quantize(Decimal("0.01"))),
        "discrepancy_count": len(discrepancies),
        "discrepancies": discrepancies,
        "orphan_posted_fee_entries": orphan_entries,
    }
