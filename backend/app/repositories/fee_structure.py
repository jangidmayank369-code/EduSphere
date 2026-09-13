from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.fee_structure import FeeStructure


class FeeStructureRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, fee_structure: FeeStructure) -> FeeStructure:
        self.db.add(fee_structure)
        self.db.commit()
        self.db.refresh(fee_structure)

        return fee_structure

    def get_by_id(
        self,
        fee_structure_id: int,
    ) -> FeeStructure | None:
        return self.db.get(FeeStructure, fee_structure_id)

    def get_duplicate(
        self,
        *,
        school_id: int,
        academic_session_id: int,
        class_name: str | None,
        fee_head: str,
        frequency: str,
        name: str,
        exclude_id: int | None = None,
    ) -> FeeStructure | None:
        query = select(FeeStructure).where(
            FeeStructure.school_id == school_id,
            FeeStructure.academic_session_id == academic_session_id,
            FeeStructure.class_name == class_name,
            FeeStructure.fee_head == fee_head,
            FeeStructure.frequency == frequency,
            FeeStructure.name == name,
        )

        if exclude_id is not None:
            query = query.where(FeeStructure.id != exclude_id)

        return self.db.scalar(query)

    def list(
        self,
        *,
        school_id: int | None = None,
        academic_session_id: int | None = None,
        class_name: str | None = None,
        fee_head: str | None = None,
        frequency: str | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[FeeStructure], int]:

        filters = []

        if school_id is not None:
            filters.append(FeeStructure.school_id == school_id)

        if academic_session_id is not None:
            filters.append(
                FeeStructure.academic_session_id == academic_session_id
            )

        if class_name is not None:
            filters.append(
                FeeStructure.class_name == class_name
            )

        if fee_head is not None:
            filters.append(
                FeeStructure.fee_head == fee_head
            )

        if frequency is not None:
            filters.append(
                FeeStructure.frequency == frequency
            )

        if is_active is not None:
            filters.append(
                FeeStructure.is_active == is_active
            )

        if search:
            pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    FeeStructure.name.ilike(pattern),
                    FeeStructure.fee_head.ilike(pattern),
                    FeeStructure.class_name.ilike(pattern),
                    FeeStructure.description.ilike(pattern),
                )
            )

        total = self.db.scalar(
            select(func.count(FeeStructure.id)).where(*filters)
        ) or 0

        query = (
            select(FeeStructure)
            .where(*filters)
            .order_by(
                FeeStructure.class_name.asc(),
                FeeStructure.fee_head.asc(),
                FeeStructure.name.asc(),
                FeeStructure.id.desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(query).all())

        return items, total

    def save(self, fee_structure: FeeStructure) -> FeeStructure:
        self.db.add(fee_structure)
        self.db.commit()
        self.db.refresh(fee_structure)

        return fee_structure