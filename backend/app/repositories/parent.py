from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.parent import Parent, StudentParent


class ParentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        parent: Parent,
    ) -> Parent:
        self.db.add(parent)
        self.db.commit()
        self.db.refresh(parent)
        return parent

    def get_by_id(
        self,
        parent_id: int,
    ) -> Parent | None:
        return self.db.get(Parent, parent_id)

    def list(
        self,
        *,
        school_id: int | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Parent], int]:
        query = select(Parent)

        count_query = select(
            func.count()
        ).select_from(Parent)

        filters = []

        if school_id is not None:
            filters.append(
                Parent.school_id == school_id
            )

        if is_active is not None:
            filters.append(
                Parent.is_active == is_active
            )

        if search:
            pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    Parent.first_name.ilike(pattern),
                    Parent.middle_name.ilike(pattern),
                    Parent.last_name.ilike(pattern),
                    Parent.phone.ilike(pattern),
                    Parent.alternate_phone.ilike(pattern),
                    Parent.email.ilike(pattern),
                )
            )

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        total = self.db.scalar(count_query) or 0

        query = (
            query.order_by(
                Parent.first_name,
                Parent.last_name,
                Parent.id,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(
            self.db.scalars(query).all()
        )

        return items, total

    def save(
        self,
        parent: Parent,
    ) -> Parent:
        self.db.add(parent)
        self.db.commit()
        self.db.refresh(parent)
        return parent

    def bulk_set_active(
        self,
        parent_ids: list[int],
        is_active: bool,
    ) -> list[Parent]:
        if not parent_ids:
            return []

        parents = list(
            self.db.scalars(
                select(Parent).where(
                    Parent.id.in_(parent_ids)
                )
            ).all()
        )

        for parent in parents:
            parent.is_active = is_active

        self.db.commit()

        for parent in parents:
            self.db.refresh(parent)

        return parents

    def list_student_links(
        self,
        parent_id: int,
    ) -> list[StudentParent]:
        query = (
            select(StudentParent)
            .where(
                StudentParent.parent_id == parent_id
            )
            .order_by(StudentParent.id)
        )

        return list(
            self.db.scalars(query).all()
        )