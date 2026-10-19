
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.accounting_transaction import AccountingTransaction
from app.models.school import AcademicSession, School
from app.schemas.accounting import (
    AccountingTransactionCreate,
    AccountingTransactionResponse,
)

router = APIRouter(prefix="/accounting", tags=["Accounting"])


def _validate_school_session(
    db: Session,
    school_id: int,
    academic_session_id: int,
) -> AcademicSession:
    school = db.get(School, school_id)

    if not school or not school.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active school not found.",
        )

    session = (
        db.query(AcademicSession)
        .filter(
            AcademicSession.id == academic_session_id,
            AcademicSession.school_id == school_id,
        )
        .first()
    )

    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active academic session not found for this school.",
        )

    return session


def _validate_dates(
    start_date: date | None,
    end_date: date | None,
) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be after end_date.",
        )


@router.post(
    "/transactions",
    response_model=AccountingTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: AccountingTransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("ACCOUNTING_TRANSACTION_CREATE")
    ),
):
    _validate_school_session(
        db,
        payload.school_id,
        payload.academic_session_id,
    )

    row = AccountingTransaction(
        **payload.model_dump(),
        created_by=current_user.id,
    )
    db.add(row)

    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Transaction conflicts with an existing source record "
                "or references an invalid database record."
            ),
        ) from exc

    return row


@router.get(
    "/transactions",
    response_model=list[AccountingTransactionResponse],
)
def list_transactions(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    transaction_type: str | None = Query(
        default=None,
        pattern="^(income|expense)$",
    ),
    transaction_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(posted|voided)$",
    ),
    category: str | None = Query(default=None, max_length=100),
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("ACCOUNTING_TRANSACTION_VIEW")
    ),
):
    _validate_school_session(db, school_id, academic_session_id)
    _validate_dates(start_date, end_date)

    query = db.query(AccountingTransaction).filter(
        AccountingTransaction.school_id == school_id,
        AccountingTransaction.academic_session_id == academic_session_id,
    )

    if transaction_type:
        query = query.filter(
            AccountingTransaction.transaction_type == transaction_type
        )

    if transaction_status:
        query = query.filter(
            AccountingTransaction.status == transaction_status
        )

    if category:
        query = query.filter(
            AccountingTransaction.category == category.strip()
        )

    if start_date:
        query = query.filter(
            AccountingTransaction.transaction_date >= start_date
        )

    if end_date:
        query = query.filter(
            AccountingTransaction.transaction_date <= end_date
        )

    return (
        query.order_by(
            AccountingTransaction.transaction_date.desc(),
            AccountingTransaction.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/summary")
def accounting_summary(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("ACCOUNTING_TRANSACTION_VIEW")
    ),
):
    _validate_school_session(db, school_id, academic_session_id)
    _validate_dates(start_date, end_date)

    # Only posted transactions contribute to financial totals.
    # Voided transactions remain available in the transaction history.
    query = db.query(
        AccountingTransaction.transaction_type,
        func.coalesce(func.sum(AccountingTransaction.amount), 0),
        func.count(AccountingTransaction.id),
    ).filter(
        AccountingTransaction.school_id == school_id,
        AccountingTransaction.academic_session_id == academic_session_id,
        AccountingTransaction.status == "posted",
    )

    if start_date:
        query = query.filter(
            AccountingTransaction.transaction_date >= start_date
        )

    if end_date:
        query = query.filter(
            AccountingTransaction.transaction_date <= end_date
        )

    totals = {
        "income": Decimal("0.00"),
        "expense": Decimal("0.00"),
    }
    counts = {
        "income": 0,
        "expense": 0,
    }

    for tx_type, amount, count in query.group_by(
        AccountingTransaction.transaction_type
    ).all():
        if tx_type in totals:
            totals[tx_type] = Decimal(str(amount))
            counts[tx_type] = int(count)

    return {
        "school_id": school_id,
        "academic_session_id": academic_session_id,
        "start_date": start_date,
        "end_date": end_date,
        "total_income": totals["income"],
        "total_expense": totals["expense"],
        "net_cash_movement": totals["income"] - totals["expense"],
        "income_count": counts["income"],
        "expense_count": counts["expense"],
    }
