from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.document import Document
from app.models.parent import Parent
from app.models.school import School
from app.models.student import Student
from app.repositories.document import DocumentRepository


class DocumentService:
    def __init__(self, db: Session):
        self.repository = DocumentRepository(db)
        self.db = db

    def create(self, payload: dict) -> Document:
        school_id = payload["school_id"]
        student_id = payload.get("student_id")
        parent_id = payload.get("parent_id")

        school = self.db.get(School, school_id)

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        if student_id is not None:
            student = self.db.get(Student, student_id)

            if not student:
                raise NotFoundError(
                    "Student not found.",
                    code="STUDENT_NOT_FOUND",
                )

            if student.school_id != school_id:
                raise ConflictError(
                    "Student and document must belong to the same school.",
                    code="SCHOOL_MISMATCH",
                )

        if parent_id is not None:
            parent = self.db.get(Parent, parent_id)

            if not parent:
                raise NotFoundError(
                    "Parent not found.",
                    code="PARENT_NOT_FOUND",
                )

            if parent.school_id != school_id:
                raise ConflictError(
                    "Parent and document must belong to the same school.",
                    code="SCHOOL_MISMATCH",
                )

        document = Document(**payload)

        return self.repository.create(document)

    def get(self, document_id: int) -> Document:
        document = self.repository.get_by_id(document_id)

        if not document:
            raise NotFoundError(
                "Document not found.",
                code="DOCUMENT_NOT_FOUND",
            )

        return document

    def list(self, **filters):
        return self.repository.list(**filters)

    def update(
        self,
        document_id: int,
        payload: dict,
    ) -> Document:
        document = self.get(document_id)

        for field, value in payload.items():
            setattr(document, field, value)

        return self.repository.save(document)

    def set_active(
        self,
        document_id: int,
        is_active: bool,
    ) -> Document:
        document = self.get(document_id)
        document.is_active = is_active

        return self.repository.save(document)

    def set_archived(
        self,
        document_id: int,
        is_archived: bool,
    ) -> Document:
        document = self.get(document_id)
        document.is_archived = is_archived

        return self.repository.save(document)