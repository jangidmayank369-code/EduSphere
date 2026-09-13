from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.parent import Parent, StudentParent
from app.models.school import School
from app.repositories.parent import ParentRepository


class ParentService:
    def __init__(
        self,
        db: Session,
    ):
        self.repository = ParentRepository(db)
        self.db = db

    def create(
        self,
        school_id: int,
        payload: dict,
    ) -> Parent:
        school = self.db.get(
            School,
            school_id,
        )

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        parent = Parent(
            school_id=school_id,
            **payload,
        )

        return self.repository.create(parent)

    def get(
        self,
        parent_id: int,
    ) -> Parent:
        parent = self.repository.get_by_id(
            parent_id
        )

        if not parent:
            raise NotFoundError(
                "Parent not found.",
                code="PARENT_NOT_FOUND",
            )

        return parent

    def list(
        self,
        school_id: int | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ):
        return self.repository.list(
            school_id=school_id,
            is_active=is_active,
            search=search,
            page=page,
            page_size=page_size,
        )

    def update(
        self,
        parent_id: int,
        payload: dict,
    ) -> Parent:
        parent = self.get(parent_id)

        for field, value in payload.items():
            setattr(
                parent,
                field,
                value,
            )

        return self.repository.save(parent)

    def set_active(
        self,
        parent_id: int,
        is_active: bool,
    ) -> Parent:
        parent = self.get(parent_id)

        parent.is_active = is_active

        return self.repository.save(parent)

    def bulk_set_active(
        self,
        parent_ids: list[int],
        is_active: bool,
    ) -> list[Parent]:
        if not parent_ids:
            return []

        unique_ids = list(
            dict.fromkeys(parent_ids)
        )

        for parent_id in unique_ids:
            self.get(parent_id)

        return self.repository.bulk_set_active(
            parent_ids=unique_ids,
            is_active=is_active,
        )

    def list_students(
        self,
        parent_id: int,
    ):
        self.get(parent_id)

        return self.repository.list_student_links(
            parent_id
        )