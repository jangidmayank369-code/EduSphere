from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.school import AcademicSession, School


class SchoolRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, school: School) -> School:
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    def get_by_id(self, school_id: int) -> School | None:
        return self.db.get(School, school_id)

    def get_by_code(self, code: str) -> School | None:
        query = select(School).where(School.code == code)
        return self.db.scalar(query)

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
    ) -> tuple[list[School], int]:
        query = select(School)

        if is_active is not None:
            query = query.where(School.is_active == is_active)

        items_query = (
            query
            .order_by(School.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(items_query).all())

        count_query = select(func.count()).select_from(School)

        if is_active is not None:
            count_query = count_query.where(
                School.is_active == is_active
            )

        total = self.db.scalar(count_query) or 0

        return items, total

    def save(self, school: School) -> School:
        self.db.commit()
        self.db.refresh(school)
        return school


class AcademicSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, session: AcademicSession) -> AcademicSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_id(
        self,
        session_id: int,
    ) -> AcademicSession | None:
        return self.db.get(AcademicSession, session_id)

    def list_for_school(
        self,
        school_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
    ) -> tuple[list[AcademicSession], int]:
        query = select(AcademicSession).where(
            AcademicSession.school_id == school_id
        )

        if is_active is not None:
            query = query.where(
                AcademicSession.is_active == is_active
            )

        items_query = (
            query
            .order_by(AcademicSession.start_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(items_query).all())

        count_query = (
            select(func.count())
            .select_from(AcademicSession)
            .where(AcademicSession.school_id == school_id)
        )

        if is_active is not None:
            count_query = count_query.where(
                AcademicSession.is_active == is_active
            )

        total = self.db.scalar(count_query) or 0

        return items, total

    def get_current(
        self,
        school_id: int,
    ) -> AcademicSession | None:
        query = select(AcademicSession).where(
            AcademicSession.school_id == school_id,
            AcademicSession.is_current.is_(True),
            AcademicSession.is_active.is_(True),
        )

        return self.db.scalar(query)

    def clear_current(self, school_id: int) -> None:
        sessions = self.db.scalars(
            select(AcademicSession).where(
                AcademicSession.school_id == school_id,
                AcademicSession.is_current.is_(True),
            )
        ).all()

        for session in sessions:
            session.is_current = False

    def save(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        self.db.commit()
        self.db.refresh(session)
        return session