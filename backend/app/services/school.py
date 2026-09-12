from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.school import AcademicSession, School
from app.repositories.school import (
    AcademicSessionRepository,
    SchoolRepository,
)


class SchoolService:
    def __init__(self, db: Session):
        self.repository = SchoolRepository(db)

    def create(
        self,
        *,
        name: str,
        code: str,
        email: str | None = None,
        phone: str | None = None,
        address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        country: str = "India",
        postal_code: str | None = None,
        website: str | None = None,
        affiliation: str | None = None,
        principal_name: str | None = None,
        logo_url: str | None = None,
    ) -> School:
        normalized_code = code.strip().upper()

        if self.repository.get_by_code(normalized_code):
            raise ConflictError(
                "School code already exists.",
                code="SCHOOL_CODE_EXISTS",
            )

        school = School(
            name=name.strip(),
            code=normalized_code,
            email=email,
            phone=phone,
            address=address,
            city=city,
            state=state,
            country=country.strip(),
            postal_code=postal_code,
            website=website,
            affiliation=affiliation,
            principal_name=principal_name,
            logo_url=logo_url,
        )

        return self.repository.create(school)

    def get(self, school_id: int) -> School:
        school = self.repository.get_by_id(school_id)

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        return school

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
    ) -> tuple[list[School], int]:
        return self.repository.list(
            page=page,
            page_size=page_size,
            is_active=is_active,
        )

    def update(
        self,
        school_id: int,
        **updates,
    ) -> School:
        school = self.get(school_id)

        for field, value in updates.items():
            if value is not None:
                if isinstance(value, str):
                    value = value.strip()

                setattr(school, field, value)

        return self.repository.save(school)

    def set_active(
        self,
        school_id: int,
        is_active: bool,
    ) -> School:
        school = self.get(school_id)
        school.is_active = is_active

        return self.repository.save(school)


class AcademicSessionService:
    def __init__(self, db: Session):
        self.repository = AcademicSessionRepository(db)
        self.school_repository = SchoolRepository(db)

    def create(
        self,
        *,
        school_id: int,
        name: str,
        start_date: date,
        end_date: date,
    ) -> AcademicSession:
        if not self.school_repository.get_by_id(school_id):
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        if end_date <= start_date:
            raise ConflictError(
                "Academic session end date must be after start date.",
                code="INVALID_SESSION_DATES",
            )

        session = AcademicSession(
            school_id=school_id,
            name=name.strip(),
            start_date=start_date,
            end_date=end_date,
            is_current=False,
            is_active=True,
        )

        return self.repository.create(session)

    def get(self, session_id: int) -> AcademicSession:
        session = self.repository.get_by_id(session_id)

        if not session:
            raise NotFoundError(
                "Academic session not found.",
                code="ACADEMIC_SESSION_NOT_FOUND",
            )

        return session

    def list_for_school(
        self,
        school_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
    ) -> tuple[list[AcademicSession], int]:
        if not self.school_repository.get_by_id(school_id):
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        return self.repository.list_for_school(
            school_id,
            page=page,
            page_size=page_size,
            is_active=is_active,
        )

    def get_current(self, school_id: int) -> AcademicSession:
        if not self.school_repository.get_by_id(school_id):
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        session = self.repository.get_current(school_id)

        if not session:
            raise NotFoundError(
                "No current academic session found.",
                code="CURRENT_SESSION_NOT_FOUND",
            )

        return session

    def set_current(self, session_id: int) -> AcademicSession:
        session = self.get(session_id)

        if not session.is_active:
            raise ConflictError(
                "Inactive academic session cannot be made current.",
                code="SESSION_INACTIVE",
            )

        self.repository.clear_current(session.school_id)

        session.is_current = True

        return self.repository.save(session)

    def update(
        self,
        session_id: int,
        **updates,
    ) -> AcademicSession:
        session = self.get(session_id)

        start_date = updates.get(
            "start_date",
            session.start_date,
        )
        end_date = updates.get(
            "end_date",
            session.end_date,
        )

        if start_date is not None and end_date is not None:
            if end_date <= start_date:
                raise ConflictError(
                    "Academic session end date must be after start date.",
                    code="INVALID_SESSION_DATES",
                )

        for field, value in updates.items():
            if value is not None:
                if isinstance(value, str):
                    value = value.strip()

                setattr(session, field, value)

        return self.repository.save(session)

    def set_active(
        self,
        session_id: int,
        is_active: bool,
    ) -> AcademicSession:
        session = self.get(session_id)

        if not is_active and session.is_current:
            raise ConflictError(
                "Current academic session cannot be deactivated.",
                code="CURRENT_SESSION_CANNOT_BE_INACTIVE",
            )

        session.is_active = is_active

        return self.repository.save(session)