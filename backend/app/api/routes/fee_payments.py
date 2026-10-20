
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.accounting_transaction import AccountingTransaction
from app.models.fee_payment import FeePayment
from app.models.student import Student
from app.models.student_fee_plan import (
    StudentFeePlan,
    StudentFeePlanInstallment,
)
from app.schemas.fee_payment import (
    FeePaymentCreate,
    FeePaymentResponse,
    FeePaymentReversalCreate,
)
from app.services.fee_payment import FeePaymentService


router = APIRouter(
    prefix="/fee-payments",
    tags=["Fee Payments"],
)


def _first_value(obj, *names, default=None):
    """Return the first available non-empty model attribute."""
    for name in names:
        value = getattr(obj, name, None)
        if value is not None and value != "":
            return value
    return default


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


@router.post(
    "",
    response_model=FeePaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fee_payment(
    payload: FeePaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_PAYMENT_CREATE")
    ),
):
    service = FeePaymentService(db)
    return service.create_payment(
        payload=payload,
        received_by=current_user.id,
    )


@router.get(
    "",
    response_model=list[FeePaymentResponse],
)
def list_fee_payments(
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    student_id: int | None = Query(default=None, gt=0),
    student_fee_plan_id: int | None = Query(default=None, gt=0),
    payment_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(posted|reversed)$",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_PAYMENT_VIEW")
    ),
):
    query = db.query(FeePayment).filter(
        FeePayment.school_id == school_id,
        FeePayment.academic_session_id == academic_session_id,
    )

    if student_id is not None:
        query = query.filter(
            FeePayment.student_id == student_id
        )

    if student_fee_plan_id is not None:
        query = query.filter(
            FeePayment.student_fee_plan_id
            == student_fee_plan_id
        )

    if payment_status is not None:
        query = query.filter(
            FeePayment.status == payment_status
        )

    return (
        query.order_by(
            FeePayment.payment_date.desc(),
            FeePayment.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{payment_id}/receipt")
def get_fee_payment_receipt(
    payment_id: int,
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_PAYMENT_VIEW")
    ),
):
    payment = (
        db.query(FeePayment)
        .filter(
            FeePayment.id == payment_id,
            FeePayment.school_id == school_id,
            FeePayment.academic_session_id
            == academic_session_id,
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee payment not found.",
        )

    student = (
        db.query(Student)
        .filter(
            Student.id == payment.student_id,
            Student.school_id == school_id,
            Student.academic_session_id
            == academic_session_id,
        )
        .first()
    )

    plan = (
        db.query(StudentFeePlan)
        .filter(
            StudentFeePlan.id == payment.student_fee_plan_id,
            StudentFeePlan.school_id == school_id,
            StudentFeePlan.academic_session_id
            == academic_session_id,
            StudentFeePlan.student_id == payment.student_id,
        )
        .first()
    )

    if student is None or plan is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Student or fee plan details are unavailable "
                "for this receipt."
            ),
        )

    installment = None

    if payment.installment_id is not None:
        installment = (
            db.query(StudentFeePlanInstallment)
            .filter(
                StudentFeePlanInstallment.id
                == payment.installment_id,
                StudentFeePlanInstallment.student_fee_plan_id
                == plan.id,
            )
            .first()
        )

    total_paid = _money(
        db.query(
            func.coalesce(func.sum(FeePayment.amount), 0)
        )
        .filter(
            FeePayment.school_id == school_id,
            FeePayment.academic_session_id == academic_session_id,
            FeePayment.student_fee_plan_id == plan.id,
            FeePayment.status == "posted",
        )
        .scalar()
    )

    installment_paid = None
    installment_pending = None
    if installment is not None:
        installment_paid = _money(
            db.query(func.coalesce(func.sum(FeePayment.amount), 0))
            .filter(
                FeePayment.school_id == school_id,
                FeePayment.academic_session_id == academic_session_id,
                FeePayment.student_fee_plan_id == plan.id,
                FeePayment.installment_id == installment.id,
                FeePayment.status == "posted",
            )
            .scalar()
        )
        installment_pending = max(
            Decimal("0.00"),
            _money(installment.amount) - installment_paid,
        )

    plan_total = _money(plan.net_amount)
    outstanding = max(
        Decimal("0.00"),
        plan_total - total_paid,
    )

    # A reversal receipt references its original payment's accounting entry.
    # The original income entry is retained with status="voided" for auditability;
    # reversals do not create a second income entry.
    accounting_payment_id = (
        payment.reverses_payment_id
        if payment.reverses_payment_id is not None
        else payment.id
    )
    accounting = (
        db.query(AccountingTransaction)
        .filter(
            AccountingTransaction.school_id == school_id,
            AccountingTransaction.academic_session_id
            == academic_session_id,
            AccountingTransaction.source_type == "fee_payment",
            AccountingTransaction.source_id == str(accounting_payment_id),
            AccountingTransaction.transaction_type == "income",
        )
        .first()
    )

    student_name = _first_value(
        student,
        "full_name",
        "name",
        default=None,
    )

    if not student_name:
        first_name = _first_value(
            student,
            "first_name",
            default="",
        )
        last_name = _first_value(
            student,
            "last_name",
            default="",
        )
        student_name = (
            f"{first_name} {last_name}".strip()
            or f"Student #{student.id}"
        )

    return {
        "receipt": {
            "receipt_number": payment.receipt_number,
            "payment_id": payment.id,
            "payment_date": payment.payment_date,
            "status": payment.status,
            "reversal_reason": payment.reversal_reason,
            "reversed_at": payment.reversed_at,
        },
        "school": {
            "school_id": school_id,
        },
        "student": {
            "student_id": student.id,
            "name": student_name,
            "admission_number": _first_value(
                student,
                "admission_number",
                "admission_no",
                "admission_id",
            ),
            "class_name": _first_value(
                student,
                "class_name",
                "class_label",
                "class_id",
            ),
            "section": _first_value(
                student,
                "section",
                "section_name",
            ),
        },
        "fee": {
            "fee_plan_id": plan.id,
            "plan_amount": plan_total,
            "total_paid": total_paid,
            "outstanding_balance": outstanding,
            "installment_id": payment.installment_id,
            "installment_amount": (
                _money(installment.amount)
                if installment is not None
                else None
            ),
            "installment_status": (
                installment.status
                if installment is not None
                else None
            ),
            "installment_paid": installment_paid,
            "installment_pending": installment_pending,
        },
        "payment": {
            "amount": _money(payment.amount),
            "payment_mode": payment.payment_mode,
            "reference_number": payment.reference_number,
            "remarks": payment.remarks,
            "received_by": payment.received_by,
        },
        "accounting": {
            "transaction_id": (
                accounting.id
                if accounting is not None
                else None
            ),
            "status": (
                accounting.status
                if accounting is not None
                else "missing"
            ),
        },
    }


@router.get(
    "/{payment_id}",
    response_model=FeePaymentResponse,
)
def get_fee_payment(
    payment_id: int,
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_PAYMENT_VIEW")
    ),
):
    payment = (
        db.query(FeePayment)
        .filter(
            FeePayment.id == payment_id,
            FeePayment.school_id == school_id,
            FeePayment.academic_session_id
            == academic_session_id,
        )
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee payment not found.",
        )

    return payment


@router.post(
    "/{payment_id}/reverse",
    response_model=FeePaymentResponse,
)
def reverse_fee_payment(
    payment_id: int,
    payload: FeePaymentReversalCreate,
    school_id: int = Query(gt=0),
    academic_session_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_PAYMENT_CREATE")
    ),
):
    service = FeePaymentService(db)

    return service.reverse_payment(
        payment_id=payment_id,
        school_id=school_id,
        academic_session_id=academic_session_id,
        payload=payload,
        received_by=current_user.id,
    )
