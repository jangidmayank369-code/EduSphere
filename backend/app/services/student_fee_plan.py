from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.core.exceptions import EduSphereException, NotFoundError
from app.models.fee_structure import FeeStructure
from app.models.school import AcademicSession, School
from app.models.student import Student
from app.models.student_fee_plan import (
    StudentFeePlan,
    StudentFeePlanInstallment,
    StudentFeePlanItem,
)
from app.repositories.student_fee_plan import StudentFeePlanRepository
from app.schemas.student_fee_plan import (
    BulkStudentFeePlanCreate,
    StudentFeePlanCreate,
    StudentFeePlanInstallmentCreate,
    StudentFeePlanItemCreate,
    StudentFeePlanUpdate,
)


MONEY = Decimal("0.01")


class StudentFeePlanService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StudentFeePlanRepository(db)

    @staticmethod
    def money(value: Decimal | int | float) -> Decimal:
        return Decimal(str(value)).quantize(
            MONEY,
            rounding=ROUND_HALF_UP,
        )

    @staticmethod
    def bad_request(
        message: str,
        *,
        code: str,
        details=None,
    ):
        raise EduSphereException(
            message,
            code=code,
            status_code=400,
            details=details,
        )

    @staticmethod
    def calculate_discount(
        amount: Decimal,
        discount_type: str,
        discount_value: Decimal,
    ) -> Decimal:
        amount = max(Decimal("0.00"), amount)

        if discount_type == "none":
            return Decimal("0.00")

        if discount_type == "percentage":
            discount = (
                amount
                * discount_value
                / Decimal("100")
            )
        else:
            discount = discount_value

        return min(
            amount,
            StudentFeePlanService.money(discount),
        )

    def _validate_school_session(
        self,
        school_id: int,
        academic_session_id: int,
    ):
        school = (
            self.db.query(School)
            .filter(
                School.id == school_id,
                School.is_active.is_(True),
            )
            .first()
        )

        if not school:
            raise NotFoundError(
                "School not found or inactive.",
                code="SCHOOL_NOT_FOUND",
            )

        session = (
            self.db.query(AcademicSession)
            .filter(
                AcademicSession.id == academic_session_id,
                AcademicSession.school_id == school_id,
                AcademicSession.is_active.is_(True),
            )
            .first()
        )

        if not session:
            raise NotFoundError(
                "Academic session not found or inactive.",
                code="ACADEMIC_SESSION_NOT_FOUND",
            )

        return school, session

    def _get_student(
        self,
        student_id: int,
        school_id: int,
        academic_session_id: int,
    ):
        student = (
            self.db.query(Student)
            .filter(
                Student.id == student_id,
                Student.school_id == school_id,
                Student.academic_session_id
                == academic_session_id,
            )
            .first()
        )

        if not student:
            raise NotFoundError(
                "Student not found for the selected school/session.",
                code="STUDENT_NOT_FOUND",
            )

        if not student.is_active:
            self.bad_request(
                "Cannot create a fee plan for an inactive student.",
                code="STUDENT_INACTIVE",
            )

        return student

    def _get_fee_structures(
        self,
        school_id: int,
        academic_session_id: int,
        item_payloads: list[StudentFeePlanItemCreate],
    ):
        fee_structure_ids = {
            item.fee_structure_id
            for item in item_payloads
        }

        structures = (
            self.db.query(FeeStructure)
            .filter(
                FeeStructure.id.in_(fee_structure_ids),
                FeeStructure.school_id == school_id,
                FeeStructure.academic_session_id
                == academic_session_id,
                FeeStructure.is_active.is_(True),
            )
            .all()
        )

        by_id = {
            item.id: item
            for item in structures
        }

        missing = fee_structure_ids - set(by_id)

        if missing:
            raise NotFoundError(
                "One or more fee structures were not found or inactive.",
                code="FEE_STRUCTURE_NOT_FOUND",
                details={
                    "fee_structure_ids": sorted(missing),
                },
            )

        return by_id

    def _calculate_items(
        self,
        item_payloads: list[StudentFeePlanItemCreate],
        structures: dict[int, FeeStructure],
    ):
        result = []

        gross = Decimal("0.00")
        item_discount_total = Decimal("0.00")

        for payload in item_payloads:
            structure = structures[
                payload.fee_structure_id
            ]

            base_amount = (
                payload.custom_amount
                if payload.custom_amount is not None
                else structure.amount
            )

            base_amount = self.money(base_amount)

            if structure.is_optional and not payload.is_selected:
                payable = Decimal("0.00")
                discount_amount = Decimal("0.00")
            else:
                discount_amount = self.calculate_discount(
                    base_amount,
                    payload.item_discount_type,
                    payload.item_discount_value,
                )

                payable = self.money(
                    base_amount - discount_amount
                )

                gross += base_amount
                item_discount_total += discount_amount

            result.append(
                {
                    "fee_structure_id": structure.id,
                    "amount": base_amount,
                    "custom_amount": payload.custom_amount,
                    "item_discount_type": (
                        payload.item_discount_type
                    ),
                    "item_discount_value": (
                        payload.item_discount_value
                    ),
                    "item_discount_amount": discount_amount,
                    "payable_amount": payable,
                    "is_optional": structure.is_optional,
                    "is_selected": payload.is_selected,
                    "notes": payload.notes,
                }
            )

        return (
            result,
            self.money(gross),
            self.money(item_discount_total),
        )

    def _calculate_plan_discount(
        self,
        amount: Decimal,
        discount_type: str,
        discount_value: Decimal,
    ):
        return self.calculate_discount(
            amount,
            discount_type,
            discount_value,
        )

    def _build_installments(
        self,
        plan_id: int,
        net_amount: Decimal,
        mode: str,
        count: int,
        custom_installments: list[
            StudentFeePlanInstallmentCreate
        ] | None,
    ):
        if net_amount <= 0:
            self.bad_request(
                "Net fee amount must be greater than zero.",
                code="INVALID_NET_AMOUNT",
            )

        rows = []

        if mode == "single":
            rows.append(
                StudentFeePlanInstallment(
                    student_fee_plan_id=plan_id,
                    installment_number=1,
                    name="Installment 1",
                    due_date=date.today(),
                    amount=self.money(net_amount),
                )
            )

        elif mode == "equal":
            base = self.money(
                net_amount / count
            )

            amounts = [
                base
                for _ in range(count)
            ]

            difference = self.money(
                net_amount - sum(amounts)
            )

            amounts[-1] = self.money(
                amounts[-1] + difference
            )

            for index, amount in enumerate(
                amounts,
                start=1,
            ):
                rows.append(
                    StudentFeePlanInstallment(
                        student_fee_plan_id=plan_id,
                        installment_number=index,
                        name=f"Installment {index}",
                        due_date=(
                            date.today()
                            + timedelta(
                                days=30 * (index - 1)
                            )
                        ),
                        amount=amount,
                    )
                )

        else:
            if not custom_installments:
                self.bad_request(
                    "Custom installments are required.",
                    code="CUSTOM_INSTALLMENTS_REQUIRED",
                )

            custom_total = self.money(
                sum(
                    item.amount
                    for item in custom_installments
                )
            )

            if custom_total != self.money(net_amount):
                self.bad_request(
                    "Custom installment total must equal net fee amount.",
                    code="INSTALLMENT_TOTAL_MISMATCH",
                    details={
                        "net_amount": str(
                            self.money(net_amount)
                        ),
                        "installment_total": str(
                            custom_total
                        ),
                    },
                )

            seen_numbers = set()

            for item in custom_installments:
                if item.installment_number in seen_numbers:
                    self.bad_request(
                        "Duplicate installment number.",
                        code="DUPLICATE_INSTALLMENT_NUMBER",
                    )

                seen_numbers.add(
                    item.installment_number
                )

                rows.append(
                    StudentFeePlanInstallment(
                        student_fee_plan_id=plan_id,
                        installment_number=(
                            item.installment_number
                        ),
                        name=item.name,
                        due_date=item.due_date,
                        amount=self.money(item.amount),
                    )
                )

            rows.sort(
                key=lambda item:
                item.installment_number
            )

        return rows

    def create(
        self,
        payload: StudentFeePlanCreate,
    ) -> StudentFeePlan:
        self._validate_school_session(
            payload.school_id,
            payload.academic_session_id,
        )

        self._get_student(
            payload.student_id,
            payload.school_id,
            payload.academic_session_id,
        )

        existing = self.repo.get_by_student_session(
            payload.student_id,
            payload.academic_session_id,
        )

        if existing:
            self.bad_request(
                "A fee plan already exists for this student and academic session.",
                code="FEE_PLAN_ALREADY_EXISTS",
                details={
                    "plan_id": existing.id,
                },
            )

        structures = self._get_fee_structures(
            payload.school_id,
            payload.academic_session_id,
            payload.items,
        )

        (
            calculated_items,
            gross,
            item_discount,
        ) = self._calculate_items(
            payload.items,
            structures,
        )

        amount_after_item_discount = self.money(
            gross - item_discount
        )

        plan_discount = self._calculate_plan_discount(
            amount_after_item_discount,
            payload.discount_type,
            payload.discount_value,
        )

        net_amount = self.money(
            amount_after_item_discount
            - plan_discount
        )

        if net_amount <= 0:
            self.bad_request(
                "Fee plan payable amount must be greater than zero.",
                code="INVALID_NET_AMOUNT",
            )

        plan = StudentFeePlan(
            school_id=payload.school_id,
            student_id=payload.student_id,
            academic_session_id=(
                payload.academic_session_id
            ),
            name=payload.name,
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
            discount_type=payload.discount_type,
            discount_value=payload.discount_value,
            scholarship_name=payload.scholarship_name,
            concession_reason=(
                payload.concession_reason
            ),
            notes=payload.notes,
            is_active=payload.is_active,
            status=(
                "active"
                if payload.is_active
                else "inactive"
            ),
            gross_amount=gross,
            item_discount_amount=item_discount,
            plan_discount_amount=plan_discount,
            net_amount=net_amount,
            installment_mode=(
                payload.installment_mode
            ),
            installment_count=(
                payload.installment_count
            ),
        )

        self.repo.create(plan)

        for item_data in calculated_items:
            self.repo.create_item(
                StudentFeePlanItem(
                    student_fee_plan_id=plan.id,
                    **item_data,
                )
            )

        installment_rows = self._build_installments(
            plan.id,
            net_amount,
            payload.installment_mode,
            payload.installment_count,
            payload.installments,
        )

        for installment in installment_rows:
            self.repo.create_installment(
                installment
            )

        self.db.commit()

        return self.repo.get_by_id(plan.id)

    def get(
        self,
        plan_id: int,
    ) -> StudentFeePlan:
        plan = self.repo.get_by_id(plan_id)

        if not plan:
            raise NotFoundError(
                "Student fee plan not found.",
                code="FEE_PLAN_NOT_FOUND",
            )

        return plan

    def get_items(
        self,
        plan_id: int,
    ):
        self.get(plan_id)

        return self.repo.list_items(plan_id)

    def get_installments(
        self,
        plan_id: int,
    ):
        self.get(plan_id)

        return self.repo.list_installments(
            plan_id
        )

    def list(self, **kwargs):
        return self.repo.list(**kwargs)

    def update(
        self,
        plan_id: int,
        payload: StudentFeePlanUpdate,
    ):
        plan = self.get(plan_id)

        if plan.status == "cancelled":
            self.bad_request(
                "Cancelled fee plans cannot be updated.",
                code="FEE_PLAN_CANCELLED",
            )

        data = payload.model_dump(
            exclude_unset=True,
            exclude={
                "items",
                "installments",
                "installment_mode",
                "installment_count",
            },
        )

        for key, value in data.items():
            setattr(plan, key, value)

        requires_recalculation = (
            payload.items is not None
            or payload.discount_type is not None
            or payload.discount_value is not None
        )

        if requires_recalculation:
            item_payloads = (
                payload.items
                if payload.items is not None
                else [
                    StudentFeePlanItemCreate(
                        fee_structure_id=(
                            item.fee_structure_id
                        ),
                        custom_amount=(
                            item.custom_amount
                        ),
                        item_discount_type=(
                            item.item_discount_type
                        ),
                        item_discount_value=(
                            item.item_discount_value
                        ),
                        is_selected=(
                            item.is_selected
                        ),
                        notes=item.notes,
                    )
                    for item in self.repo.list_items(
                        plan.id
                    )
                ]
            )

            structures = self._get_fee_structures(
                plan.school_id,
                plan.academic_session_id,
                item_payloads,
            )

            (
                calculated_items,
                gross,
                item_discount,
            ) = self._calculate_items(
                item_payloads,
                structures,
            )

            discount_type = (
                payload.discount_type
                if payload.discount_type is not None
                else plan.discount_type
            )

            discount_value = (
                payload.discount_value
                if payload.discount_value is not None
                else plan.discount_value
            )

            plan_discount = (
                self._calculate_plan_discount(
                    self.money(
                        gross - item_discount
                    ),
                    discount_type,
                    discount_value,
                )
            )

            net_amount = self.money(
                gross
                - item_discount
                - plan_discount
            )

            plan.discount_type = discount_type
            plan.discount_value = discount_value
            plan.gross_amount = gross
            plan.item_discount_amount = (
                item_discount
            )
            plan.plan_discount_amount = (
                plan_discount
            )
            plan.net_amount = net_amount

            self.repo.delete_items(plan.id)

            for item_data in calculated_items:
                self.repo.create_item(
                    StudentFeePlanItem(
                        student_fee_plan_id=plan.id,
                        **item_data,
                    )
                )

            mode = (
                payload.installment_mode
                if payload.installment_mode is not None
                else plan.installment_mode
            )

            count = (
                payload.installment_count
                if payload.installment_count is not None
                else plan.installment_count
            )

            custom_installments = (
                payload.installments
            )

            self.repo.delete_installments(
                plan.id
            )

            installment_rows = (
                self._build_installments(
                    plan.id,
                    net_amount,
                    mode,
                    count,
                    custom_installments,
                )
            )

            for installment in installment_rows:
                self.repo.create_installment(
                    installment
                )

            plan.installment_mode = mode
            plan.installment_count = count

        self.repo.save(plan)
        self.db.commit()

        return self.repo.get_by_id(plan.id)

    def set_active(
        self,
        plan_id: int,
        is_active: bool,
    ):
        plan = self.get(plan_id)

        plan.is_active = is_active
        plan.status = (
            "active"
            if is_active
            else "inactive"
        )

        self.repo.save(plan)
        self.db.commit()

        return self.repo.get_by_id(plan.id)

    def recalculate(
        self,
        plan_id: int,
    ):
        plan = self.get(plan_id)

        item_rows = self.repo.list_items(
            plan.id
        )

        if not item_rows:
            self.bad_request(
                "Fee plan has no fee items.",
                code="FEE_PLAN_ITEMS_MISSING",
            )

        payload_items = [
            StudentFeePlanItemCreate(
                fee_structure_id=(
                    item.fee_structure_id
                ),
                custom_amount=item.custom_amount,
                item_discount_type=(
                    item.item_discount_type
                ),
                item_discount_value=(
                    item.item_discount_value
                ),
                is_selected=item.is_selected,
                notes=item.notes,
            )
            for item in item_rows
        ]

        structures = self._get_fee_structures(
            plan.school_id,
            plan.academic_session_id,
            payload_items,
        )

        (
            calculated_items,
            gross,
            item_discount,
        ) = self._calculate_items(
            payload_items,
            structures,
        )

        plan_discount = (
            self._calculate_plan_discount(
                self.money(
                    gross - item_discount
                ),
                plan.discount_type,
                plan.discount_value,
            )
        )

        net_amount = self.money(
            gross
            - item_discount
            - plan_discount
        )

        if net_amount <= 0:
            self.bad_request(
                "Recalculated payable amount must be greater than zero.",
                code="INVALID_NET_AMOUNT",
            )

        plan.gross_amount = gross
        plan.item_discount_amount = (
            item_discount
        )
        plan.plan_discount_amount = (
            plan_discount
        )
        plan.net_amount = net_amount

        self.repo.delete_items(plan.id)

        for item_data in calculated_items:
            self.repo.create_item(
                StudentFeePlanItem(
                    student_fee_plan_id=plan.id,
                    **item_data,
                )
            )

        self.repo.delete_installments(
            plan.id
        )

        existing_installments = self.repo.list_installments(plan.id)

        custom_installments = None
        if plan.installment_mode == "custom":
            custom_installments = [
                StudentFeePlanInstallmentCreate(
                    installment_number=item.installment_number,
                    name=item.name,
                    due_date=item.due_date,
                    amount=item.amount,
                )
                for item in existing_installments
            ]

        installments = self._build_installments(
            plan.id,
            net_amount,
            plan.installment_mode,
            plan.installment_count,
            custom_installments,
        )

        for installment in installments:
            self.repo.create_installment(
                installment
            )

        self.repo.save(plan)
        self.db.commit()

        return self.repo.get_by_id(plan.id)

    def bulk_create(
        self,
        payload: BulkStudentFeePlanCreate,
    ):
        self._validate_school_session(
            payload.school_id,
            payload.academic_session_id,
        )

        requested_ids = list(
            dict.fromkeys(
                payload.student_ids
            )
        )

        created_plan_ids = []
        skipped_student_ids = []
        failed_student_ids = []

        for student_id in requested_ids:
            existing = (
                self.repo.get_by_student_session(
                    student_id,
                    payload.academic_session_id,
                )
            )

            if existing:
                skipped_student_ids.append(
                    student_id
                )
                continue

            try:
                plan_payload = (
                    StudentFeePlanCreate(
                        school_id=payload.school_id,
                        student_id=student_id,
                        academic_session_id=(
                            payload.academic_session_id
                        ),
                        name=payload.name,
                        effective_from=(
                            payload.effective_from
                        ),
                        effective_to=(
                            payload.effective_to
                        ),
                        discount_type=(
                            payload.discount_type
                        ),
                        discount_value=(
                            payload.discount_value
                        ),
                        scholarship_name=(
                            payload.scholarship_name
                        ),
                        concession_reason=(
                            payload.concession_reason
                        ),
                        notes=payload.notes,
                        installment_mode=(
                            payload.installment_mode
                        ),
                        installment_count=(
                            payload.installment_count
                        ),
                        items=payload.items,
                    )
                )

                plan = self.create(
                    plan_payload
                )

                created_plan_ids.append(
                    plan.id
                )

            except (
                EduSphereException,
                ValueError,
            ):
                self.db.rollback()
                failed_student_ids.append(
                    student_id
                )

        return {
            "created_plan_ids": created_plan_ids,
            "skipped_student_ids": (
                skipped_student_ids
            ),
            "failed_student_ids": (
                failed_student_ids
            ),
            "total_requested": len(
                requested_ids
            ),
            "total_created": len(
                created_plan_ids
            ),
        }