from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.document import Document


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, document: Document) -> Document:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_by_id(self, document_id: int) -> Document | None:
        return self.db.get(Document, document_id)

    def save(self, document: Document) -> Document:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def list(
        self,
        *,
        school_id: int | None = None,
        student_id: int | None = None,
        parent_id: int | None = None,
        document_type: str | None = None,
        verification_status: str | None = None,
        is_active: bool | None = None,
        is_archived: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Document], int]:
        query = select(Document)
        count_query = select(func.count()).select_from(Document)

        filters = []

        if school_id is not None:
            filters.append(Document.school_id == school_id)

        if student_id is not None:
            filters.append(Document.student_id == student_id)

        if parent_id is not None:
            filters.append(Document.parent_id == parent_id)

        if document_type:
            filters.append(
                Document.document_type == document_type.strip()
            )

        if verification_status:
            filters.append(
                Document.verification_status
                == verification_status.strip()
            )

        if is_active is not None:
            filters.append(Document.is_active == is_active)

        if is_archived is not None:
            filters.append(Document.is_archived == is_archived)

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        total = self.db.scalar(count_query) or 0

        query = (
            query.order_by(Document.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(query).all())

        return items, total