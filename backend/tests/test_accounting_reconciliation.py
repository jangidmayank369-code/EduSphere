from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.routes.accounting_transactions import _fee_payment_reconciliation_issue


def payment(*, amount="100.00", payment_date=date(2026, 10, 1), status="posted"):
    return SimpleNamespace(
        amount=Decimal(amount),
        payment_date=payment_date,
        status=status,
    )


def entry(*, amount="100.00", transaction_date=date(2026, 10, 1), status="posted"):
    return SimpleNamespace(
        amount=Decimal(amount),
        transaction_date=transaction_date,
        status=status,
    )


def test_reconciliation_reports_missing_accounting_entry():
    assert _fee_payment_reconciliation_issue(payment(), []) == "missing_accounting_entry"


def test_reconciliation_reports_duplicate_accounting_entries():
    assert _fee_payment_reconciliation_issue(payment(), [entry(), entry()]) == "duplicate_accounting_entries"


def test_reconciliation_reports_amount_mismatch():
    assert _fee_payment_reconciliation_issue(payment(), [entry(amount="99.00")]) == "amount_mismatch"


def test_reconciliation_reports_date_mismatch():
    assert _fee_payment_reconciliation_issue(
        payment(), [entry(transaction_date=date(2026, 10, 2))]
    ) == "date_mismatch"


def test_reconciliation_requires_voided_posting_for_reversed_payment():
    assert _fee_payment_reconciliation_issue(
        payment(status="reversed"), [entry(status="posted")]
    ) == "status_mismatch"
    assert _fee_payment_reconciliation_issue(
        payment(status="reversed"), [entry(status="voided")]
    ) is None


def test_reconciliation_accepts_matching_posted_payment():
    assert _fee_payment_reconciliation_issue(payment(), [entry()]) is None
