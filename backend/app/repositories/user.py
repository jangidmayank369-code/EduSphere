from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _normalize_search(search: str | None) -> str | None:
        if not search:
            return None

        normalized = " ".join(search.strip().split())
        return normalized or None

    @staticmethod
    def _normalize_status(status: str | None) -> str | None:
        if not status:
            return None

        normalized = status.strip().lower()
        return normalized or None

    @staticmethod
    def _clamp_pagination(page: int, page_size: int) -> tuple[int, int]:
        safe_page = max(1, int(page))
        safe_page_size = min(100, max(1, int(page_size)))

        return safe_page, safe_page_size

    @staticmethod
    def _with_roles(statement):
        return statement.options(
            selectinload(User.roles),
        )

    # ------------------------------------------------------------------
    # Read - single user
    # ------------------------------------------------------------------

    def get_by_id(self, user_id: int) -> User | None:
        statement = (
            select(User)
            .options(
                selectinload(User.roles),
            )
            .where(User.id == user_id)
        )

        return self.db.scalar(statement)

    def get_by_email(self, email: str) -> User | None:
        normalized_email = self._normalize_email(email)

        if not normalized_email:
            return None

        statement = (
            select(User)
            .options(
                selectinload(User.roles),
            )
            .where(User.email == normalized_email)
        )

        return self.db.scalar(statement)

    # ------------------------------------------------------------------
    # Read - list users
    # ------------------------------------------------------------------

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[User], int]:
        page, page_size = self._clamp_pagination(
            page,
            page_size,
        )

        normalized_search = self._normalize_search(search)
        normalized_status = self._normalize_status(status)

        statement = select(User)

        # Search by name or email.
        if normalized_search:
            search_term = f"%{normalized_search}%"

            statement = statement.where(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        # Status filter.
        if normalized_status == "active":
            statement = statement.where(
                User.is_active.is_(True)
            )

        elif normalized_status == "inactive":
            statement = statement.where(
                User.is_active.is_(False)
            )

        # Total count before pagination.
        count_statement = select(
            func.count()
        ).select_from(
            statement.subquery()
        )

        total = self.db.scalar(count_statement) or 0

        # Stable newest-first ordering.
        statement = (
            self._with_roles(statement)
            .order_by(User.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        users = list(
            self.db.scalars(statement).all()
        )

        return users, total

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    # ------------------------------------------------------------------
    # Update / Save
    # ------------------------------------------------------------------

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()