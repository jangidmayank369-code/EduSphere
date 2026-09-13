from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
)
from app.models.parent import StudentParent
from app.models.school import AcademicSession, School
from app.models.student import Student
from app.repositories.parent import ParentRepository
from app.repositories.student import StudentRepository


class StudentService:
    def __init__(self, db: Session):
        self.repository = StudentRepository(db)
        self.parent_repository = ParentRepository(db)
        self.db = db

    @staticmethod
    def _normalize_admission_number(
        admission_number: str,
    ) -> str:
        normalized = admission_number.strip().upper()

        if not normalized:
            raise ConflictError(
                "Admission number cannot be empty.",
                code="ADMISSION_NUMBER_REQUIRED",
            )

        return normalized

    def _validate_school_and_session(
        self,
        school_id: int,
        academic_session_id: int,
    ) -> AcademicSession:
        school = self.db.get(
            School,
            school_id,
        )

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        session = self.db.get(
            AcademicSession,
            academic_session_id,
        )

        if not session:
            raise NotFoundError(
                "Academic session not found.",
                code="ACADEMIC_SESSION_NOT_FOUND",
            )

        if session.school_id != school_id:
            raise ConflictError(
                "Academic session does not belong to the selected school.",
                code="SESSION_SCHOOL_MISMATCH",
            )

        if not session.is_active:
            raise ConflictError(
                "Academic session is inactive.",
                code="SESSION_INACTIVE",
            )

        return session

    def create(
        self,
        school_id: int,
        academic_session_id: int,
        payload: dict,
    ) -> Student:
        self._validate_school_and_session(
            school_id=school_id,
            academic_session_id=academic_session_id,
        )

        create_payload = dict(payload)

        admission_number = (
            self._normalize_admission_number(
                create_payload["admission_number"]
            )
        )

        existing = (
            self.repository.get_by_admission_number(
                school_id=school_id,
                admission_number=admission_number,
            )
        )

        if existing:
            raise ConflictError(
                "Admission number already exists in this school.",
                code="ADMISSION_NUMBER_EXISTS",
            )

        create_payload["admission_number"] = (
            admission_number
        )

        student = Student(
            school_id=school_id,
            academic_session_id=academic_session_id,
            **create_payload,
        )

        return self.repository.create(student)

    def get(
        self,
        student_id: int,
    ) -> Student:
        student = self.repository.get_by_id(
            student_id
        )

        if not student:
            raise NotFoundError(
                "Student not found.",
                code="STUDENT_NOT_FOUND",
            )

        return student

    def list(
        self,
        school_id: int | None = None,
        academic_session_id: int | None = None,
        status: str | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ):
        normalized_search = (
            search.strip()
            if search
            else None
        )

        return self.repository.list(
            school_id=school_id,
            academic_session_id=academic_session_id,
            status=status,
            is_active=is_active,
            search=normalized_search,
            page=page,
            page_size=page_size,
        )

    def update(
        self,
        student_id: int,
        payload: dict,
    ) -> Student:
        student = self.get(student_id)

        update_payload = dict(payload)

        if "admission_number" in update_payload:
            admission_number = (
                self._normalize_admission_number(
                    update_payload["admission_number"]
                )
            )

            existing = (
                self.repository.get_by_admission_number(
                    school_id=student.school_id,
                    admission_number=admission_number,
                )
            )

            if (
                existing
                and existing.id != student.id
            ):
                raise ConflictError(
                    "Admission number already exists in this school.",
                    code="ADMISSION_NUMBER_EXISTS",
                )

            update_payload["admission_number"] = (
                admission_number
            )

        target_school_id = update_payload.get(
            "school_id",
            student.school_id,
        )

        target_session_id = update_payload.get(
            "academic_session_id",
            student.academic_session_id,
        )

        if (
            target_school_id != student.school_id
            or target_session_id
            != student.academic_session_id
        ):
            self._validate_school_and_session(
                school_id=target_school_id,
                academic_session_id=target_session_id,
            )

        for field, value in update_payload.items():
            setattr(
                student,
                field,
                value,
            )

        return self.repository.save(student)

    def set_active(
        self,
        student_id: int,
        is_active: bool,
    ) -> Student:
        student = self.get(student_id)

        student.is_active = is_active
        student.status = (
            "active"
            if is_active
            else "inactive"
        )

        return self.repository.save(student)

    def bulk_set_active(
        self,
        student_ids: list[int],
        is_active: bool,
    ) -> list[Student]:
        if not student_ids:
            return []

        unique_ids = list(
            dict.fromkeys(student_ids)
        )

        # Validate every requested student first.
        # This avoids silently updating only part of
        # the requested collection.
        for student_id in unique_ids:
            self.get(student_id)

        return self.repository.bulk_set_active(
            student_ids=unique_ids,
            is_active=is_active,
        )

    def link_parent(
        self,
        student_id: int,
        parent_id: int,
        relationship_type: str,
        is_primary: bool,
        is_emergency_contact: bool,
    ) -> StudentParent:
        student = self.get(student_id)

        parent = self.parent_repository.get_by_id(
            parent_id
        )

        if not parent:
            raise NotFoundError(
                "Parent not found.",
                code="PARENT_NOT_FOUND",
            )

        if parent.school_id != student.school_id:
            raise ConflictError(
                "Parent and student must belong to the same school.",
                code="SCHOOL_MISMATCH",
            )

        normalized_relationship = (
            relationship_type.strip()
        )

        if not normalized_relationship:
            raise ConflictError(
                "Relationship type is required.",
                code="RELATIONSHIP_TYPE_REQUIRED",
            )

        existing_links = (
            self.repository.list_parent_links(
                student_id
            )
        )

        for link in existing_links:
            if link.parent_id == parent_id:
                raise ConflictError(
                    "Parent is already linked to this student.",
                    code="PARENT_ALREADY_LINKED",
                )

        # A student can have only one primary contact.
        if is_primary:
            for link in existing_links:
                link.is_primary = False

        # A student can have only one emergency contact
        # under the current data model.
        if is_emergency_contact:
            for link in existing_links:
                link.is_emergency_contact = False

        link = StudentParent(
            student_id=student_id,
            parent_id=parent_id,
            relationship_type=normalized_relationship,
            is_primary=is_primary,
            is_emergency_contact=is_emergency_contact,
        )

        return self.repository.add_parent_link(
            link
        )

    def list_parents(
        self,
        student_id: int,
    ):
        self.get(student_id)

        return self.repository.list_parent_links(
            student_id
        )

    def unlink_parent(
        self,
        student_id: int,
        parent_id: int,
    ) -> None:
        self.get(student_id)

        link = self.repository.get_parent_link(
            student_id=student_id,
            parent_id=parent_id,
        )

        if not link:
            raise NotFoundError(
                "Parent link not found.",
                code="PARENT_LINK_NOT_FOUND",
            )

        self.repository.delete_parent_link(
            link
        )