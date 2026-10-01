from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
)
from app.models.school import AcademicSession, School
from app.repositories.school import SchoolRepository


class SchoolService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = SchoolRepository(db)

    # ------------------------------------------------------------------
    # School
    # ------------------------------------------------------------------

    def create(self, **data) -> School:
        name = self._clean_required_text(
            data.get("name"),
            "School name",
        )

        code = self._normalize_code(data.get("code"))

        existing = self.repository.get_by_code(code)

        if existing:
            raise ConflictError(
                "A school with this code already exists.",
                code="SCHOOL_CODE_ALREADY_EXISTS",
                details={"code": code},
            )

        data["name"] = name
        data["code"] = code

        self._validate_school_configuration(data)

        school = School(**data)

        return self.repository.create(school)

    def get(self, school_id: int) -> School:
        school = self.repository.get_by_id(school_id)

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
                details={"school_id": school_id},
            )

        return school

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
    ):
        return self.repository.list(
            page=page,
            page_size=page_size,
            search=search,
            is_active=is_active,
        )

    def update(
        self,
        school_id: int,
        **data,
    ) -> School:
        school = self.get(school_id)

        # PATCH semantics:
        # only keys explicitly supplied by the API are changed.
        if "name" in data and data["name"] is not None:
            school.name = self._clean_required_text(
                data["name"],
                "School name",
            )

        for field in (
            "email",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            "website",
            "affiliation",
            "affiliation_number",
            "registration_number",
            "recognition_number",
            "udise_code",
            "school_type",
            "management_type",
            "established_year",
            "pan_number",
            "tan_number",
            "gst_number",
            "principal_name",
            "principal_email",
            "principal_phone",
            "logo_url",
            "favicon_url",
            "primary_color",
            "secondary_color",
            "tagline",
            "academic_year_start_month",
            "academic_year_end_month",
            "grading_system",
            "attendance_type",
            "working_days_per_week",
        ):
            if field in data:
                setattr(school, field, data[field])

        self._validate_school_configuration(
            {
                "academic_year_start_month": (
                    school.academic_year_start_month
                ),
                "academic_year_end_month": (
                    school.academic_year_end_month
                ),
                "working_days_per_week": (
                    school.working_days_per_week
                ),
                "established_year": school.established_year,
            }
        )

        return self.repository.save(school)

    def set_active(
        self,
        school_id: int,
        is_active: bool,
    ) -> School:
        school = self.get(school_id)

        if school.is_active == is_active:
            return school

        # Do not allow deactivation when the school still has a
        # current academic session.
        if not is_active:
            current_session = self.repository.get_current(
                school.id
            )

            if current_session:
                raise ConflictError(
                    "The school cannot be deactivated while it has "
                    "a current academic session.",
                    code="CURRENT_SESSION_EXISTS",
                    details={
                        "school_id": school.id,
                        "session_id": current_session.id,
                    },
                )

        school.is_active = is_active

        return self.repository.save(school)

    # ------------------------------------------------------------------
    # School validation
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_required_text(
        value,
        field_name: str,
    ) -> str:
        if value is None:
            raise BadRequestError(
                f"{field_name} is required.",
                code="REQUIRED_FIELD",
            )

        value = str(value).strip()

        if not value:
            raise BadRequestError(
                f"{field_name} cannot be empty.",
                code="EMPTY_FIELD",
                details={"field": field_name},
            )

        return value

    @staticmethod
    def _normalize_code(value) -> str:
        value = SchoolService._clean_required_text(
            value,
            "School code",
        )

        return value.upper()

    @staticmethod
    def _validate_school_configuration(data: dict) -> None:
        start_month = data.get(
            "academic_year_start_month"
        )
        end_month = data.get(
            "academic_year_end_month"
        )

        if start_month is not None and not 1 <= int(start_month) <= 12:
            raise BadRequestError(
                "Academic year start month must be between 1 and 12.",
                code="INVALID_ACADEMIC_START_MONTH",
            )

        if end_month is not None and not 1 <= int(end_month) <= 12:
            raise BadRequestError(
                "Academic year end month must be between 1 and 12.",
                code="INVALID_ACADEMIC_END_MONTH",
            )

        working_days = data.get(
            "working_days_per_week"
        )

        if working_days is not None and not 1 <= int(working_days) <= 7:
            raise BadRequestError(
                "Working days per week must be between 1 and 7.",
                code="INVALID_WORKING_DAYS",
            )

        established_year = data.get(
            "established_year"
        )

        if established_year is not None and not 1800 <= int(
            established_year
        ) <= 2100:
            raise BadRequestError(
                "Established year must be between 1800 and 2100.",
                code="INVALID_ESTABLISHED_YEAR",
            )


# ============================================================================
# ACADEMIC SESSION SERVICE
# ============================================================================


class AcademicSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = SchoolRepository(db)

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(
        self,
        school_id: int,
        name: str,
        start_date,
        end_date,
    ) -> AcademicSession:
        self._validate_school(school_id)

        name = self._clean_session_name(name)

        self._validate_dates(
            start_date,
            end_date,
        )

        self._ensure_unique_session_name(
            school_id,
            name,
        )

        self._ensure_no_overlap(
            school_id,
            start_date,
            end_date,
        )

        session = AcademicSession(
            school_id=school_id,
            name=name,
            start_date=start_date,
            end_date=end_date,
            is_current=False,
            is_active=True,
            is_closed=False,
            is_archived=False,
        )

        return self.repository.create_session(session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get(self, session_id: int) -> AcademicSession:
        session = self.repository.get_session_by_id(
            session_id
        )

        if not session:
            raise NotFoundError(
                "Academic session not found.",
                code="ACADEMIC_SESSION_NOT_FOUND",
                details={"session_id": session_id},
            )

        return session

    def list_for_school(
        self,
        school_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
        is_archived: bool | None = None,
    ):
        self._validate_school(school_id)

        return self.repository.list_for_school(
            school_id,
            page=page,
            page_size=page_size,
            is_active=is_active,
            is_archived=is_archived,
        )

    def get_current(
        self,
        school_id: int,
    ) -> AcademicSession | None:
        self._validate_school(school_id)

        return self.repository.get_current(
            school_id
        )

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(
        self,
        session_id: int,
        **data,
    ) -> AcademicSession:
        session = self.get(session_id)

        if session.is_archived:
            raise ConflictError(
                "An archived academic session cannot be edited.",
                code="ARCHIVED_SESSION_IMMUTABLE",
            )

        if session.is_closed:
            raise ConflictError(
                "A closed academic session cannot be edited.",
                code="CLOSED_SESSION_IMMUTABLE",
            )

        name = data.get(
            "name",
            session.name,
        )

        start_date = data.get(
            "start_date",
            session.start_date,
        )

        end_date = data.get(
            "end_date",
            session.end_date,
        )

        name = self._clean_session_name(name)

        self._validate_dates(
            start_date,
            end_date,
        )

        if (
            name.lower() != session.name.strip().lower()
        ):
            self._ensure_unique_session_name(
                session.school_id,
                name,
                exclude_session_id=session.id,
            )

        if (
            start_date != session.start_date
            or end_date != session.end_date
        ):
            self._ensure_no_overlap(
                session.school_id,
                start_date,
                end_date,
                exclude_session_id=session.id,
            )

        session.name = name
        session.start_date = start_date
        session.end_date = end_date

        return self.repository.save_session(session)

    # ------------------------------------------------------------------
    # Set current
    # ------------------------------------------------------------------

    def set_current(
        self,
        session_id: int,
    ) -> AcademicSession:
        session = self.get(session_id)

        if session.is_archived:
            raise ConflictError(
                "An archived academic session cannot be made current.",
                code="ARCHIVED_SESSION_CANNOT_BE_CURRENT",
            )

        if session.is_closed:
            raise ConflictError(
                "A closed academic session cannot be made current.",
                code="CLOSED_SESSION_CANNOT_BE_CURRENT",
            )

        if not session.is_active:
            raise ConflictError(
                "An inactive academic session cannot be made current.",
                code="INACTIVE_SESSION_CANNOT_BE_CURRENT",
            )

        return self.repository.set_current(session)

    # ------------------------------------------------------------------
    # Activate / deactivate
    # ------------------------------------------------------------------

    def set_active(
        self,
        session_id: int,
        is_active: bool,
    ) -> AcademicSession:
        session = self.get(session_id)

        if session.is_archived:
            raise ConflictError(
                "An archived academic session cannot be activated.",
                code="ARCHIVED_SESSION_IMMUTABLE",
            )

        if session.is_closed and is_active:
            raise ConflictError(
                "A closed academic session cannot be reactivated.",
                code="CLOSED_SESSION_IMMUTABLE",
            )

        if session.is_current and not is_active:
            raise ConflictError(
                "The current academic session cannot be deactivated. "
                "Set another session as current first.",
                code="CURRENT_SESSION_CANNOT_BE_DEACTIVATED",
            )

        session.is_active = is_active

        if not is_active:
            session.is_current = False

        return self.repository.save_session(session)

    # ------------------------------------------------------------------
    # Close
    # ------------------------------------------------------------------

    def close(
        self,
        session_id: int,
    ) -> AcademicSession:
        session = self.get(session_id)

        if session.is_archived:
            raise ConflictError(
                "An archived academic session is already closed "
                "from the active lifecycle.",
                code="ARCHIVED_SESSION",
            )

        if session.is_closed:
            return session

        if session.is_current:
            raise ConflictError(
                "The current academic session cannot be closed. "
                "Set another session as current first.",
                code="CURRENT_SESSION_CANNOT_BE_CLOSED",
            )

        return self.repository.close_session(
            session
        )

    # ------------------------------------------------------------------
    # Archive
    # ------------------------------------------------------------------

    def archive(
        self,
        session_id: int,
    ) -> AcademicSession:
        session = self.get(session_id)

        if session.is_current:
            raise ConflictError(
                "The current academic session cannot be archived.",
                code="CURRENT_SESSION_CANNOT_BE_ARCHIVED",
            )

        if not session.is_closed:
            raise ConflictError(
                "Only a closed academic session can be archived.",
                code="SESSION_MUST_BE_CLOSED",
            )

        if session.is_archived:
            return session

        return self.repository.archive_session(
            session
        )

    # ------------------------------------------------------------------
    # Clone
    # ------------------------------------------------------------------

    def clone(
        self,
        source_session_id: int,
        *,
        name: str,
        start_date,
        end_date,
        carry_forward: bool = False,
    ) -> AcademicSession:
        source = self.get(source_session_id)

        if source.is_archived:
            raise ConflictError(
                "An archived session cannot be used as a clone source.",
                code="ARCHIVED_SESSION_CANNOT_BE_CLONED",
            )

        name = self._clean_session_name(name)

        self._validate_dates(
            start_date,
            end_date,
        )

        self._ensure_unique_session_name(
            source.school_id,
            name,
        )

        self._ensure_no_overlap(
            source.school_id,
            start_date,
            end_date,
        )

        new_session = AcademicSession(
            school_id=source.school_id,
            name=name,
            start_date=start_date,
            end_date=end_date,
            is_current=False,
            is_active=True,
            is_closed=False,
            is_archived=False,
            cloned_from_session_id=source.id,
            carried_forward_from_session_id=(
                source.id if carry_forward else None
            ),
        )

        return self.repository.create_session(
            new_session
        )

    # ------------------------------------------------------------------
    # Carry-forward
    # ------------------------------------------------------------------

    def carry_forward(
        self,
        source_session_id: int,
        *,
        name: str,
        start_date,
        end_date,
    ) -> AcademicSession:
        return self.clone(
            source_session_id,
            name=name,
            start_date=start_date,
            end_date=end_date,
            carry_forward=True,
        )

    # ------------------------------------------------------------------
    # Validation helpers
    # ------------------------------------------------------------------

    def _validate_school(
        self,
        school_id: int,
    ) -> School:
        school = self.repository.get_by_id(
            school_id
        )

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
                details={"school_id": school_id},
            )

        if not school.is_active:
            raise ConflictError(
                "The school is inactive.",
                code="INACTIVE_SCHOOL",
                details={"school_id": school_id},
            )

        return school

    @staticmethod
    def _clean_session_name(
        name: str,
    ) -> str:
        if name is None:
            raise BadRequestError(
                "Academic session name is required.",
                code="SESSION_NAME_REQUIRED",
            )

        name = str(name).strip()

        if not name:
            raise BadRequestError(
                "Academic session name cannot be empty.",
                code="SESSION_NAME_EMPTY",
            )

        return name

    @staticmethod
    def _validate_dates(
        start_date,
        end_date,
    ) -> None:
        if start_date is None or end_date is None:
            raise BadRequestError(
                "Both start date and end date are required.",
                code="SESSION_DATES_REQUIRED",
            )

        if end_date <= start_date:
            raise BadRequestError(
                "End date must be after start date.",
                code="INVALID_SESSION_DATE_RANGE",
            )

    def _ensure_unique_session_name(
        self,
        school_id: int,
        name: str,
        *,
        exclude_session_id: int | None = None,
    ) -> None:
        existing = self.repository.get_session_by_name(
            school_id,
            name,
        )

        if (
            existing
            and existing.id != exclude_session_id
        ):
            raise ConflictError(
                "An academic session with this name already exists "
                "for this school.",
                code="ACADEMIC_SESSION_NAME_ALREADY_EXISTS",
                details={
                    "school_id": school_id,
                    "name": name,
                },
            )

    def _ensure_no_overlap(
        self,
        school_id: int,
        start_date,
        end_date,
        *,
        exclude_session_id: int | None = None,
    ) -> None:
        existing = self.repository.get_overlapping_session(
            school_id,
            start_date,
            end_date,
            exclude_session_id=exclude_session_id,
        )

        if existing:
            raise ConflictError(
                "The academic session dates overlap with an existing "
                "academic session.",
                code="ACADEMIC_SESSION_DATE_OVERLAP",
                details={
                    "existing_session_id": existing.id,
                    "existing_session_name": existing.name,
                },
            )