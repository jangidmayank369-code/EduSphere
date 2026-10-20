
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
)
from app.models.accounting_transaction import AccountingTransaction
from app.models.audit import AuditLog
from app.models.fee_payment import FeePayment
from app.models.school import AcademicSession, School
from app.models.student import Student
from app.models.student_fee_plan import (
    StudentFeePlan,
    StudentFeePlanInstallment,
)
from app.schemas.fee_payment import (
    FeePaymentCreate,
    FeePaymentReversalCreate,
)


MONEY = Decimal("0.01")


class FeePaymentService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def money(value) -> Decimal:
        return Decimal(str(value)).quantize(
            MONEY,
            rounding=ROUND_HALF_UP,
        )

    def create_payment(
        self,
        payload: FeePaymentCreate,
        received_by: int | None = None,
    ) -> FeePayment:
        amount = self.money(payload.amount)

        if amount <= 0:
            raise BadRequestError(
                "Payment amount must be greater than zero."
            )

        if payload.payment_date > date.today():
            raise BadRequestError(
                "Payment date cannot be in the future."
            )

        try:
            school = (
                self.db.query(School)
                .filter(
                    School.id == payload.school_id,
                    School.is_active.is_(True),
                )
                .first()
            )

            if school is None:
                raise NotFoundError(
                    "Active school not found.",
                    code="SCHOOL_NOT_FOUND",
                )

            session = (
                self.db.query(AcademicSession)
                .filter(
                    AcademicSession.id == payload.academic_session_id,
                    AcademicSession.school_id == payload.school_id,
                    AcademicSession.is_active.is_(True),
                )
                .first()
            )

            if session is None:
                raise NotFoundError(
                    "Active academic session not found.",
                    code="ACADEMIC_SESSION_NOT_FOUND",
                )

            if payload.idempotency_key:
                existing = (
                    self.db.query(FeePayment)
                    .filter(
                        FeePayment.school_id == payload.school_id,
                        FeePayment.academic_session_id
                        == payload.academic_session_id,
                        FeePayment.idempotency_key
                        == payload.idempotency_key,
                    )
                    .first()
                )

                if existing is not None:
                    same_request = (
                        existing.student_id == payload.student_id
                        and existing.student_fee_plan_id
                        == payload.student_fee_plan_id
                        and (
                            payload.installment_id is None
                            or existing.installment_id == payload.installment_id
                        )
                        and existing.amount == amount
                        and existing.payment_date == payload.payment_date
                        and existing.payment_mode == payload.payment_mode
                        and existing.reference_number
                        == payload.reference_number
                        and existing.remarks == payload.remarks
                    )

                    if (
                        same_request
                        and existing.status == "posted"
                    ):
                        accounting = (
                            self.db.query(AccountingTransaction)
                            .filter(
                                AccountingTransaction.school_id
                                == payload.school_id,
                                AccountingTransaction.academic_session_id
                                == payload.academic_session_id,
                                AccountingTransaction.source_type
                                == "fee_payment",
                                AccountingTransaction.source_id
                                == str(existing.id),
                                AccountingTransaction.transaction_type
                                == "income",
                                AccountingTransaction.status == "posted",
                            )
                            .first()
                        )

                        if accounting is not None:
                            return existing

                        raise ConflictError(
                            "Existing payment has no matching posted "
                            "accounting entry. Reconciliation is required.",
                            code="ACCOUNTING_ENTRY_MISSING",
                        )

                    raise ConflictError(
                        "This idempotency key has already been used.",
                        code="IDEMPOTENCY_KEY_REUSED",
                    )

            student = (
                self.db.query(Student)
                .filter(
                    Student.id == payload.student_id,
                    Student.school_id == payload.school_id,
                    Student.academic_session_id
                    == payload.academic_session_id,
                    Student.is_active.is_(True),
                )
                .first()
            )

            if student is None:
                raise NotFoundError(
                    "Active student not found for this session.",
                    code="STUDENT_NOT_FOUND",
                )

            plan = (
                self.db.query(StudentFeePlan)
                .filter(
                    StudentFeePlan.id == payload.student_fee_plan_id,
                    StudentFeePlan.school_id == payload.school_id,
                    StudentFeePlan.student_id == payload.student_id,
                    StudentFeePlan.academic_session_id
                    == payload.academic_session_id,
                    StudentFeePlan.is_active.is_(True),
                    StudentFeePlan.status == "active",
                )
                .with_for_update()
                .first()
            )

            if plan is None:
                raise NotFoundError(
                    "Active fee plan not found for this student.",
                    code="FEE_PLAN_NOT_FOUND",
                )

            plan_total = self.money(plan.net_amount)

            if plan_total <= 0:
                raise BadRequestError(
                    "The fee plan has no payable balance."
                )

            installment = None
            installment_paid = Decimal("0.00")

            # If the client does not provide an installment, allocate the
            # payment to the first active installment with an outstanding
            # balance. This keeps legacy callers from creating unallocated
            # payments when a plan is installment-based.
            active_installments = (
                self.db.query(StudentFeePlanInstallment)
                .filter(
                    StudentFeePlanInstallment.student_fee_plan_id == plan.id,
                    StudentFeePlanInstallment.is_active.is_(True),
                )
                .order_by(StudentFeePlanInstallment.installment_number.asc())
                .with_for_update()
                .all()
            )

            if payload.installment_id is not None:
                installment = next(
                    (
                        item for item in active_installments
                        if item.id == payload.installment_id
                    ),
                    None,
                )
                if installment is None:
                    raise NotFoundError(
                        "Installment not found for this fee plan.",
                        code="INSTALLMENT_NOT_FOUND",
                    )
            elif active_installments:
                for candidate in active_installments:
                    candidate_paid = self.money(
                        self.db.query(func.coalesce(func.sum(FeePayment.amount), 0))
                        .filter(
                            FeePayment.school_id == payload.school_id,
                            FeePayment.academic_session_id == payload.academic_session_id,
                            FeePayment.student_fee_plan_id == plan.id,
                            FeePayment.installment_id == candidate.id,
                            FeePayment.status == "posted",
                        )
                        .scalar()
                    )
                    if candidate_paid < self.money(candidate.amount):
                        installment = candidate
                        installment_paid = candidate_paid
                        break
                if installment is None:
                    raise BadRequestError(
                        "All active installments have already been paid."
                    )

            if installment is not None:
                if payload.installment_id is not None:
                    installment_paid = self.money(
                        self.db.query(func.coalesce(func.sum(FeePayment.amount), 0))
                        .filter(
                            FeePayment.school_id == payload.school_id,
                            FeePayment.academic_session_id == payload.academic_session_id,
                            FeePayment.student_fee_plan_id == plan.id,
                            FeePayment.installment_id == installment.id,
                            FeePayment.status == "posted",
                        )
                        .scalar()
                    )

                installment_total = self.money(installment.amount)
                installment_balance = self.money(installment_total - installment_paid)
                if installment_balance <= 0:
                    raise BadRequestError(
                        "This installment has already been fully paid."
                    )
                if amount > installment_balance:
                    raise BadRequestError(
                        "Payment exceeds installment balance of "
                        f"{installment_balance}."
                    )

            total_paid = self.money(
                self.db.query(
                    func.coalesce(func.sum(FeePayment.amount), 0)
                )
                .filter(
                    FeePayment.school_id == payload.school_id,
                    FeePayment.academic_session_id
                    == payload.academic_session_id,
                    FeePayment.student_fee_plan_id == plan.id,
                    FeePayment.status == "posted",
                )
                .scalar()
            )

            outstanding = self.money(plan_total - total_paid)

            if outstanding <= 0:
                raise BadRequestError(
                    "This fee plan has already been fully paid."
                )

            if amount > outstanding:
                raise BadRequestError(
                    f"Payment exceeds outstanding balance of {outstanding}."
                )

            payment = FeePayment(
                school_id=payload.school_id,
                academic_session_id=payload.academic_session_id,
                student_id=payload.student_id,
                student_fee_plan_id=plan.id,
                installment_id=(installment.id if installment is not None else None),
                receipt_number=(
                    f"FEE-{payload.school_id}-"
                    f"{payload.academic_session_id}-"
                    f"{uuid4().hex[:12].upper()}"
                ),
                amount=amount,
                payment_date=payload.payment_date,
                payment_mode=payload.payment_mode,
                reference_number=payload.reference_number,
                remarks=payload.remarks,
                status="posted",
                idempotency_key=payload.idempotency_key,
                received_by=received_by,
            )

            self.db.add(payment)
            self.db.flush()

            if installment is not None:
                new_installment_paid = installment_paid + amount
                installment.status = (
                    "paid"
                    if new_installment_paid
                    >= self.money(installment.amount)
                    else "partial"
                )

            accounting = AccountingTransaction(
                school_id=payload.school_id,
                academic_session_id=payload.academic_session_id,
                transaction_type="income",
                category="Student Fees",
                amount=amount,
                transaction_date=payload.payment_date,
                description=f"Fee receipt {payment.receipt_number}",
                payment_mode=payload.payment_mode,
                reference_number=(
                    payload.reference_number or payment.receipt_number
                )[:100],
                source_type="fee_payment",
                source_id=str(payment.id),
                status="posted",
                created_by=received_by,
            )

            self.db.add(accounting)
            self.db.flush()

            # Keep the audit event in the same database transaction as the
            # payment and accounting entry so all three commit or roll back.
            self.db.add(
                AuditLog(
                    actor_user_id=received_by,
                    action="CREATE",
                    resource_type="FEE_PAYMENT",
                    resource_id=str(payment.id),
                    details={
                        "school_id": payment.school_id,
                        "academic_session_id": payment.academic_session_id,
                        "student_id": payment.student_id,
                        "fee_plan_id": payment.student_fee_plan_id,
                        "installment_id": payment.installment_id,
                        "receipt_number": payment.receipt_number,
                        "amount": str(payment.amount),
                        "payment_mode": payment.payment_mode,
                        "accounting_transaction_id": accounting.id,
                    },
                )
            )

            self.db.commit()
            self.db.refresh(payment)
            return payment

        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError(
                "Payment conflicts with an existing receipt or request. "
                "Refresh the fee record and retry."
            ) from exc

        except Exception:
            self.db.rollback()
            raise

    def reverse_payment(
        self,
        payment_id: int,
        school_id: int,
        academic_session_id: int,
        payload: FeePaymentReversalCreate,
        received_by: int | None = None,
    ) -> FeePayment:
        try:
            payment = (
                self.db.query(FeePayment)
                .filter(
                    FeePayment.id == payment_id,
                    FeePayment.school_id == school_id,
                    FeePayment.academic_session_id == academic_session_id,
                )
                .with_for_update()
                .first()
            )

            if payment is None:
                raise NotFoundError(
                    "Fee payment not found.",
                    code="FEE_PAYMENT_NOT_FOUND",
                )

            if payment.status != "posted":
                raise ConflictError(
                    "Only posted payments can be reversed.",
                    code="PAYMENT_NOT_REVERSIBLE",
                )

            reason = payload.reason.strip()

            if len(reason) < 3:
                raise BadRequestError(
                    "Reversal reason must contain at least 3 characters."
                )

            accounting = (
                self.db.query(AccountingTransaction)
                .filter(
                    AccountingTransaction.school_id == school_id,
                    AccountingTransaction.academic_session_id
                    == academic_session_id,
                    AccountingTransaction.source_type == "fee_payment",
                    AccountingTransaction.source_id == str(payment.id),
                    AccountingTransaction.transaction_type == "income",
                )
                .with_for_update()
                .first()
            )

            if accounting is None or accounting.status != "posted":
                raise ConflictError(
                    "The corresponding accounting entry is missing "
                    "or is not posted. Payment was not reversed.",
                    code="ACCOUNTING_ENTRY_NOT_REVERSIBLE",
                )

            now = datetime.now(timezone.utc)

            payment.status = "reversed"
            payment.reversed_at = now
            payment.reversal_reason = reason

            accounting.status = "voided"

            reversal = FeePayment(
                school_id=payment.school_id,
                academic_session_id=payment.academic_session_id,
                student_id=payment.student_id,
                student_fee_plan_id=payment.student_fee_plan_id,
                installment_id=payment.installment_id,
                receipt_number=(
                    f"REV-{payment.school_id}-"
                    f"{payment.academic_session_id}-"
                    f"{uuid4().hex[:12].upper()}"
                ),
                amount=payment.amount,
                payment_date=date.today(),
                payment_mode=payment.payment_mode,
                reference_number=payment.receipt_number,
                remarks=f"Reversal of {payment.receipt_number}",
                status="reversed",
                reverses_payment_id=payment.id,
                reversal_reason=reason,
                received_by=received_by,
                reversed_at=now,
            )

            self.db.add(reversal)
            self.db.flush()

            # Preserve the original posted accounting record as voided and
            # write a separately traceable offsetting entry. The accounting
            # model accepts positive amounts only, so the reversal is recorded
            # as an expense rather than a negative income transaction.
            reversal_accounting = AccountingTransaction(
                school_id=payment.school_id,
                academic_session_id=payment.academic_session_id,
                transaction_type="expense",
                category="Fee Payment Reversal",
                amount=self.money(payment.amount),
                transaction_date=date.today(),
                description=(
                    f"Reversal of fee receipt {payment.receipt_number}: {reason}"
                ),
                payment_mode=payment.payment_mode,
                reference_number=reversal.receipt_number[:100],
                source_type="fee_payment_reversal",
                source_id=str(reversal.id),
                status="posted",
                created_by=received_by,
            )
            self.db.add(reversal_accounting)
            self.db.flush()

            self.db.add(
                AuditLog(
                    actor_user_id=received_by,
                    action="REVERSE",
                    resource_type="FEE_PAYMENT",
                    resource_id=str(payment.id),
                    details={
                        "school_id": payment.school_id,
                        "academic_session_id": payment.academic_session_id,
                        "student_id": payment.student_id,
                        "original_receipt_number": payment.receipt_number,
                        "reversal_receipt_number": reversal.receipt_number,
                        "amount": str(payment.amount),
                        "reason": reason,
                        "accounting_transaction_id": accounting.id,
                        "reversal_accounting_transaction_id": reversal_accounting.id,
                        "accounting_previous_status": "posted",
                        "accounting_new_status": "voided",
                    },
                )
            )

            if payment.installment_id is not None:
                installment = (
                    self.db.query(StudentFeePlanInstallment)
                    .filter(
                        StudentFeePlanInstallment.id
                        == payment.installment_id,
                        StudentFeePlanInstallment.student_fee_plan_id
                        == payment.student_fee_plan_id,
                    )
                    .with_for_update()
                    .first()
                )

                if installment is not None:
                    remaining_paid = self.money(
                        self.db.query(
                            func.coalesce(func.sum(FeePayment.amount), 0)
                        )
                        .filter(
                            FeePayment.school_id == school_id,
                            FeePayment.academic_session_id
                            == academic_session_id,
                            FeePayment.student_fee_plan_id
                            == payment.student_fee_plan_id,
                            FeePayment.installment_id
                            == payment.installment_id,
                            FeePayment.status == "posted",
                        )
                        .scalar()
                    )

                    installment_total = self.money(installment.amount)

                    if remaining_paid >= installment_total:
                        installment.status = "paid"
                    elif remaining_paid > 0:
                        installment.status = "partial"
                    else:
                        installment.status = "pending"

            self.db.commit()
            self.db.refresh(payment)
            return payment

        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError(
                "Payment reversal conflicts with an existing record."
            ) from exc

        except Exception:
            self.db.rollback()
            raise
