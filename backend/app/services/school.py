from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.school import AcademicSession, School
from app.repositories.school import (
    AcademicSessionRepository,
    SchoolRepository,
)


class SchoolService:
    def __init__(self, db: Session):
        self.repository = SchoolRepository(db)

    def create(self, **data) -> School:
        code = data["code"].strip().upper()

        if self.repository.get_by_code(code):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="School code already exists.",
            )

        data["code"] = code

        school = School(**data)
        return self.repository.create(school)

    def get(self, school_id: int) -> School:
        school = self.repository.get_by_id(school_id)

        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found.",
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
        **data,
    ) -> School:
        school = self.get(school_id)

        if "code" in data and data["code"] is not None:
            new_code = data["code"].strip().upper()

            existing = self.repository.get_by_code(new_code)

            if existing and existing.id != school_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="School code already exists.",
                )

            data["code"] = new_code

        for key, value in data.items():
            if value is not None:
                setattr(
                    school,
                    key,
                    value.strip() if isinstance(value, str) else value,
                )

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found.",
            )

        if end_date <= start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End date must be after start date.",
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

    def get(
        self,
        session_id: int,
    ) -> AcademicSession:
        session = self.repository.get_by_id(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic session not found.",
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found.",
            )

        return self.repository.list_for_school(
            school_id,
            page=page,
            page_size=page_size,
            is_active=is_active,
        )

    def get_current(
        self,
        school_id: int,
    ) -> AcademicSession | None:
        if not self.school_repository.get_by_id(school_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found.",
            )

        return self.repository.get_current(school_id)

    def update(
        self,
        session_id: int,
        **data,
    ) -> AcademicSession:
        session = self.get(session_id)

        start_date = data.get(
            "start_date",
            session.start_date,
        )
        end_date = data.get(
            "end_date",
            session.end_date,
        )

        if end_date <= start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End date must be after start date.",
            )

        for key, value in data.items():
            if value is not None:
                setattr(
                    session,
                    key,
                    value.strip() if isinstance(value, str) else value,
                )

        return self.repository.save(session)

    def set_current(
        self,
        session_id: int,
    ) -> AcademicSession:
        session = self.get(session_id)

        if not session.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive academic session cannot be current.",
            )

        self.repository.clear_current(session.school_id)

        session.is_current = True

        return self.repository.save(session)

    def set_active(
        self,
        session_id: int,
        is_active: bool,
    ) -> AcademicSession:
        session = self.get(session_id)

        if not is_active and session.is_current:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current academic session cannot be deactivated.",
            )

        session.is_active = is_active

        return self.repository.save(session)