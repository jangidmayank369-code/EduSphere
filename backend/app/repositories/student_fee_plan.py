from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.student_fee_plan import (
    StudentFeePlan,
    StudentFeePlanInstallment,
    StudentFeePlanItem,
)


class StudentFeePlanRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, plan: StudentFeePlan) -> StudentFeePlan:
        self.db.add(plan)
        self.db.flush()
        return plan

    def create_item(self, item: StudentFeePlanItem) -> StudentFeePlanItem:
        self.db.add(item)
        self.db.flush()
        return item

    def create_installment(
        self,
        installment: StudentFeePlanInstallment,
    ) -> StudentFeePlanInstallment:
        self.db.add(installment)
        self.db.flush()
        return installment

    def get_by_id(self, plan_id: int) -> StudentFeePlan | None:
        return (
            self.db.query(StudentFeePlan)
            .filter(StudentFeePlan.id == plan_id)
            .first()
        )

    def get_by_student_session(
        self,
        student_id: int,
        academic_session_id: int,
    ) -> StudentFeePlan | None:
        return (
            self.db.query(StudentFeePlan)
            .filter(
                StudentFeePlan.student_id == student_id,
                StudentFeePlan.academic_session_id == academic_session_id,
            )
            .first()
        )

    def list_items(self, plan_id: int) -> list[StudentFeePlanItem]:
        return (
            self.db.query(StudentFeePlanItem)
            .filter(StudentFeePlanItem.student_fee_plan_id == plan_id)
            .order_by(StudentFeePlanItem.id.asc())
            .all()
        )

    def list_installments(
        self,
        plan_id: int,
    ) -> list[StudentFeePlanInstallment]:
        return (
            self.db.query(StudentFeePlanInstallment)
            .filter(
                StudentFeePlanInstallment.student_fee_plan_id == plan_id
            )
            .order_by(
                StudentFeePlanInstallment.installment_number.asc()
            )
            .all()
        )

    def list(
        self,
        *,
        school_id: int | None = None,
        academic_session_id: int | None = None,
        student_id: int | None = None,
        status: str | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ):
        query = self.db.query(StudentFeePlan)

        if school_id is not None:
            query = query.filter(StudentFeePlan.school_id == school_id)

        if academic_session_id is not None:
            query = query.filter(
                StudentFeePlan.academic_session_id == academic_session_id
            )

        if student_id is not None:
            query = query.filter(StudentFeePlan.student_id == student_id)

        if status is not None:
            query = query.filter(StudentFeePlan.status == status)

        if is_active is not None:
            query = query.filter(StudentFeePlan.is_active == is_active)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    StudentFeePlan.name.ilike(term),
                    StudentFeePlan.scholarship_name.ilike(term),
                )
            )

        total = query.count()

        plans = (
            query.order_by(StudentFeePlan.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return plans, total

    def save(self, plan: StudentFeePlan) -> StudentFeePlan:
        self.db.add(plan)
        self.db.flush()
        return plan

    def delete_items(self, plan_id: int) -> None:
        self.db.query(StudentFeePlanItem).filter(
            StudentFeePlanItem.student_fee_plan_id == plan_id
        ).delete(synchronize_session=False)

    def delete_installments(self, plan_id: int) -> None:
        self.db.query(StudentFeePlanInstallment).filter(
            StudentFeePlanInstallment.student_fee_plan_id == plan_id
        ).delete(synchronize_session=False)
