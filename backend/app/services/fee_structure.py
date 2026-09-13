from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EduSphereException, NotFoundError
from app.models.fee_structure import FeeStructure
from app.models.school import AcademicSession, School
from app.repositories.fee_structure import FeeStructureRepository


class FeeStructureService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = FeeStructureRepository(db)

    def _validation_error(
        self,
        message: str,
        *,
        code: str,
        details=None,
    ) -> EduSphereException:
        return EduSphereException(
            message,
            code=code,
            status_code=422,
            details=details,
        )

    def _validate_school_and_session(
        self,
        *,
        school_id: int,
        academic_session_id: int,
    ) -> tuple[School, AcademicSession]:

        school = self.db.get(School, school_id)

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        if not school.is_active:
            raise self._validation_error(
                "School is inactive.",
                code="SCHOOL_INACTIVE",
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
            raise self._validation_error(
                "Academic session does not belong to the selected school.",
                code="SESSION_SCHOOL_MISMATCH",
            )

        if not session.is_active:
            raise self._validation_error(
                "Academic session is inactive.",
                code="SESSION_INACTIVE",
            )

        return school, session

    @staticmethod
    def _validate_dates(
        effective_from: date,
        effective_to: date | None,
    ) -> None:

        if effective_to is not None and effective_to < effective_from:
            raise EduSphereException(
                "Effective-to date cannot be earlier than effective-from date.",
                code="INVALID_EFFECTIVE_DATES",
                status_code=422,
            )

    def create(
        self,
        *,
        school_id: int,
        academic_session_id: int,
        name: str,
        fee_head: str,
        class_name: str | None,
        frequency: str,
        amount,
        due_day: int | None,
        effective_from: date,
        effective_to: date | None,
        description: str | None,
        is_optional: bool,
        is_active: bool,
    ) -> FeeStructure:

        self._validate_school_and_session(
            school_id=school_id,
            academic_session_id=academic_session_id,
        )

        self._validate_dates(
            effective_from,
            effective_to,
        )

        name = name.strip()
        fee_head = fee_head.strip()
        class_name = class_name.strip() if class_name else None
        frequency = frequency.strip().lower()
        description = description.strip() if description else None

        if not name:
            raise self._validation_error(
                "Fee structure name cannot be empty.",
                code="INVALID_FEE_STRUCTURE_NAME",
            )

        if not fee_head:
            raise self._validation_error(
                "Fee head cannot be empty.",
                code="INVALID_FEE_HEAD",
            )

        if amount is None or amount <= 0:
            raise self._validation_error(
                "Fee amount must be greater than zero.",
                code="INVALID_FEE_AMOUNT",
            )

        if due_day is not None and not 1 <= due_day <= 31:
            raise self._validation_error(
                "Due day must be between 1 and 31.",
                code="INVALID_DUE_DAY",
            )

        duplicate = self.repository.get_duplicate(
            school_id=school_id,
            academic_session_id=academic_session_id,
            class_name=class_name,
            fee_head=fee_head,
            frequency=frequency,
            name=name,
        )

        if duplicate:
            raise ConflictError(
                "A fee structure with the same name, fee head, class and frequency already exists.",
                code="FEE_STRUCTURE_EXISTS",
            )

        fee_structure = FeeStructure(
            school_id=school_id,
            academic_session_id=academic_session_id,
            name=name,
            fee_head=fee_head,
            class_name=class_name,
            frequency=frequency,
            amount=amount,
            due_day=due_day,
            effective_from=effective_from,
            effective_to=effective_to,
            description=description,
            is_optional=is_optional,
            is_active=is_active,
        )

        return self.repository.create(fee_structure)

    def get(
        self,
        fee_structure_id: int,
    ) -> FeeStructure:

        fee_structure = self.repository.get_by_id(
            fee_structure_id
        )

        if not fee_structure:
            raise NotFoundError(
                "Fee structure not found.",
                code="FEE_STRUCTURE_NOT_FOUND",
            )

        return fee_structure

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

        if page < 1:
            raise self._validation_error(
                "Page must be greater than or equal to 1.",
                code="INVALID_PAGE",
            )

        if page_size < 1 or page_size > 200:
            raise self._validation_error(
                "Page size must be between 1 and 200.",
                code="INVALID_PAGE_SIZE",
            )

        return self.repository.list(
            school_id=school_id,
            academic_session_id=academic_session_id,
            class_name=class_name,
            fee_head=fee_head,
            frequency=frequency,
            is_active=is_active,
            search=search,
            page=page,
            page_size=page_size,
        )

    def update(
        self,
        fee_structure_id: int,
        **changes,
    ) -> FeeStructure:

        fee_structure = self.get(fee_structure_id)

        if (
            "effective_from" in changes
            or "effective_to" in changes
        ):
            effective_from = changes.get(
                "effective_from",
                fee_structure.effective_from,
            )

            effective_to = changes.get(
                "effective_to",
                fee_structure.effective_to,
            )

            self._validate_dates(
                effective_from,
                effective_to,
            )

        if "amount" in changes:
            amount = changes["amount"]

            if amount is None or amount <= 0:
                raise self._validation_error(
                    "Fee amount must be greater than zero.",
                    code="INVALID_FEE_AMOUNT",
                )

        if "due_day" in changes:
            due_day = changes["due_day"]

            if due_day is not None and not 1 <= due_day <= 31:
                raise self._validation_error(
                    "Due day must be between 1 and 31.",
                    code="INVALID_DUE_DAY",
                )

        if any(
            field in changes
            for field in (
                "name",
                "fee_head",
                "class_name",
                "frequency",
            )
        ):
            name = changes.get(
                "name",
                fee_structure.name,
            )

            fee_head = changes.get(
                "fee_head",
                fee_structure.fee_head,
            )

            class_name = changes.get(
                "class_name",
                fee_structure.class_name,
            )

            frequency = changes.get(
                "frequency",
                fee_structure.frequency,
            )

            name = name.strip() if isinstance(name, str) else name

            fee_head = (
                fee_head.strip()
                if isinstance(fee_head, str)
                else fee_head
            )

            class_name = (
                class_name.strip()
                if isinstance(class_name, str)
                else class_name
            )

            frequency = (
                frequency.strip().lower()
                if isinstance(frequency, str)
                else frequency
            )

            if not name:
                raise self._validation_error(
                    "Fee structure name cannot be empty.",
                    code="INVALID_FEE_STRUCTURE_NAME",
                )

            if not fee_head:
                raise self._validation_error(
                    "Fee head cannot be empty.",
                    code="INVALID_FEE_HEAD",
                )

            duplicate = self.repository.get_duplicate(
                school_id=fee_structure.school_id,
                academic_session_id=fee_structure.academic_session_id,
                class_name=class_name,
                fee_head=fee_head,
                frequency=frequency,
                name=name,
                exclude_id=fee_structure.id,
            )

            if duplicate:
                raise ConflictError(
                    "Another matching fee structure already exists.",
                    code="FEE_STRUCTURE_EXISTS",
                )

        for field, value in changes.items():

            if field in {
                "name",
                "fee_head",
                "frequency",
            } and isinstance(value, str):

                value = value.strip()

                if field == "frequency":
                    value = value.lower()

            if field == "class_name" and isinstance(value, str):
                value = value.strip()

            if field == "description" and isinstance(value, str):
                value = value.strip()

            setattr(
                fee_structure,
                field,
                value,
            )

        return self.repository.save(fee_structure)

    def set_active(
        self,
        fee_structure_id: int,
        is_active: bool,
    ) -> FeeStructure:

        fee_structure = self.get(fee_structure_id)

        fee_structure.is_active = is_active

        return self.repository.save(fee_structure)