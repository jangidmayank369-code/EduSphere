from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.school import AcademicSession, School


class SchoolRepository:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # School
    # ------------------------------------------------------------------

    def create(self, school: School) -> School:
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    def get_by_id(self, school_id: int) -> School | None:
        stmt = select(School).where(School.id == school_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_code(self, code: str) -> School | None:
        stmt = select(School).where(
            func.upper(School.code) == code.strip().upper()
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[School], int]:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        filters = []

        if search is not None:
            search_value = search.strip()
            if search_value:
                search_pattern = f"%{search_value}%"
                filters.append(
                    or_(
                        School.name.ilike(search_pattern),
                        School.code.ilike(search_pattern),
                        School.email.ilike(search_pattern),
                        School.phone.ilike(search_pattern),
                        School.city.ilike(search_pattern),
                        School.state.ilike(search_pattern),
                        School.affiliation.ilike(search_pattern),
                        School.affiliation_number.ilike(search_pattern),
                        School.registration_number.ilike(search_pattern),
                        School.recognition_number.ilike(search_pattern),
                        School.udise_code.ilike(search_pattern),
                    )
                )

        if is_active is not None:
            filters.append(School.is_active == is_active)

        count_stmt = select(func.count(School.id))

        if filters:
            count_stmt = count_stmt.where(*filters)

        total = int(self.db.execute(count_stmt).scalar_one())

        stmt = (
            select(School)
            .where(*filters)
            .order_by(School.name.asc(), School.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.execute(stmt).scalars().all())

        return items, total

    def save(self, school: School) -> School:
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    # ------------------------------------------------------------------
    # Academic Sessions
    # ------------------------------------------------------------------

    def create_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session_by_id(
        self,
        session_id: int,
    ) -> AcademicSession | None:
        stmt = select(AcademicSession).where(
            AcademicSession.id == session_id
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def get_session_by_name(
        self,
        school_id: int,
        name: str,
    ) -> AcademicSession | None:
        stmt = select(AcademicSession).where(
            AcademicSession.school_id == school_id,
            func.lower(AcademicSession.name) == name.strip().lower(),
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def get_overlapping_session(
        self,
        school_id: int,
        start_date,
        end_date,
        *,
        exclude_session_id: int | None = None,
    ) -> AcademicSession | None:
        """
        Finds an existing session whose date range overlaps the supplied range.
        """

        filters = [
            AcademicSession.school_id == school_id,
            AcademicSession.start_date < end_date,
            AcademicSession.end_date > start_date,
            AcademicSession.is_archived.is_(False),
        ]

        if exclude_session_id is not None:
            filters.append(
                AcademicSession.id != exclude_session_id
            )

        stmt = (
            select(AcademicSession)
            .where(*filters)
            .order_by(AcademicSession.start_date.asc())
            .limit(1)
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_school(
        self,
        school_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        is_active: bool | None = None,
        is_archived: bool | None = None,
    ) -> tuple[list[AcademicSession], int]:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        filters = [
            AcademicSession.school_id == school_id,
        ]

        if is_active is not None:
            filters.append(
                AcademicSession.is_active == is_active
            )

        if is_archived is not None:
            filters.append(
                AcademicSession.is_archived == is_archived
            )

        count_stmt = select(
            func.count(AcademicSession.id)
        ).where(*filters)

        total = int(
            self.db.execute(count_stmt).scalar_one()
        )

        stmt = (
            select(AcademicSession)
            .where(*filters)
            .order_by(
                AcademicSession.start_date.desc(),
                AcademicSession.id.desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(
            self.db.execute(stmt).scalars().all()
        )

        return items, total

    def get_current(
        self,
        school_id: int,
    ) -> AcademicSession | None:
        stmt = (
            select(AcademicSession)
            .where(
                AcademicSession.school_id == school_id,
                AcademicSession.is_current.is_(True),
                AcademicSession.is_active.is_(True),
                AcademicSession.is_archived.is_(False),
            )
            .limit(1)
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def clear_current(
        self,
        school_id: int,
    ) -> None:
        stmt = select(AcademicSession).where(
            AcademicSession.school_id == school_id,
            AcademicSession.is_current.is_(True),
        )

        sessions = list(
            self.db.execute(stmt).scalars().all()
        )

        for session in sessions:
            session.is_current = False

    def save_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    # ------------------------------------------------------------------
    # Session lifecycle helpers
    # ------------------------------------------------------------------

    def close_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        session.is_closed = True
        session.is_current = False
        session.is_active = False
        session.closed_at = datetime.utcnow()

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def archive_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        session.is_archived = True
        session.is_current = False
        session.is_active = False
        session.archived_at = datetime.utcnow()

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def set_current(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        self.clear_current(session.school_id)

        session.is_current = True
        session.is_active = True
        session.is_closed = False

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    # ------------------------------------------------------------------
    # Compatibility aliases
    # ------------------------------------------------------------------

    def create_academic_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        return self.create_session(session)

    def get_academic_session_by_id(
        self,
        session_id: int,
    ) -> AcademicSession | None:
        return self.get_session_by_id(session_id)

    def save_academic_session(
        self,
        session: AcademicSession,
    ) -> AcademicSession:
        return self.save_session(session)
