
from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.accounting_transaction import AccountingTransaction


CENT = Decimal("0.01")


def post_source_transaction(
    db: Session,
    *,
    school_id: int,
    academic_session_id: int,
    transaction_type: str,
    category: str,
    amount: Decimal | int | float | str,
    transaction_date: date,
    source_type: str,
    source_id: str | int,
    description: str,
    payment_mode: str | None = None,
    reference_number: str | None = None,
    created_by: int | None = None,
) -> AccountingTransaction:
    """Create one source-linked accounting transaction.

    Does not commit. The caller must commit the source record and
    accounting transaction together in the same database transaction.
    Retries return the existing source-linked record.
    """
    if transaction_type not in {"income", "expense"}:
        raise ValueError("transaction_type must be 'income' or 'expense'.")

    category = category.strip()
    source_type = source_type.strip().lower()
    source_id = str(source_id).strip()
    description = description.strip()

    value = Decimal(str(amount)).quantize(
        CENT, rounding=ROUND_HALF_UP
    )

    if not category:
        raise ValueError("category is required.")
    if not source_type or len(source_type) > 50:
        raise ValueError("source_type must contain 1 to 50 characters.")
    if not source_id or len(source_id) > 100:
        raise ValueError("source_id must contain 1 to 100 characters.")
    if not description:
        raise ValueError("description is required.")
    if value <= 0:
        raise ValueError("amount must be greater than zero.")

    filters = {
        "school_id": school_id,
        "academic_session_id": academic_session_id,
        "source_type": source_type,
        "source_id": source_id,
        "transaction_type": transaction_type,
    }

    existing = (
        db.query(AccountingTransaction)
        .filter_by(**filters)
        .one_or_none()
    )

    if existing is not None:
        if existing.status != "posted":
            raise ValueError(
                "This source transaction was already voided. "
                "Use a new source ID for a correcting transaction."
            )
        return existing

    row = AccountingTransaction(
        **filters,
        category=category[:100],
        amount=value,
        transaction_date=transaction_date,
        payment_mode=(
            payment_mode.strip()[:30]
            if payment_mode and payment_mode.strip()
            else None
        ),
        reference_number=(
            reference_number.strip()[:100]
            if reference_number and reference_number.strip()
            else None
        ),
        description=description,
        status="posted",
        created_by=created_by,
    )

    db.add(row)

    try:
        # Flush checks database constraints without committing.
        db.flush()
    except IntegrityError:
        # The caller should roll back its transaction before retrying.
        db.rollback()
        existing = (
            db.query(AccountingTransaction)
            .filter_by(**filters)
            .one_or_none()
        )
        if existing is not None and existing.status == "posted":
            return existing
        raise

    return row
