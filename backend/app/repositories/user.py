from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(
            select(User).where(User.email == email)
        )

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[User], int]:
        query = select(User)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        if status == "active":
            query = query.where(User.is_active.is_(True))
        elif status == "inactive":
            query = query.where(User.is_active.is_(False))

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        query = (
            query
            .order_by(User.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        return list(self.db.scalars(query).all()), total

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()