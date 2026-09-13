from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.rbac import Role
from app.models.user import User
from app.repositories.user import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def _get_role(self, role_id: int) -> Role:
        role = self.db.scalar(
            select(Role).where(
                Role.id == role_id,
            )
        )

        if not role:
            raise NotFoundError(
                "Selected role was not found.",
                code="ROLE_NOT_FOUND",
            )

        return role

    def create_user(
        self,
        email: str,
        full_name: str,
        password: str,
        role_id: int,
    ) -> User:
        email = email.lower().strip()
        full_name = full_name.strip()

        if self.repository.get_by_email(email):
            raise ConflictError(
                "A user with this email already exists.",
                code="USER_EMAIL_EXISTS",
            )

        role = self._get_role(role_id)

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            is_active=True,
        )

        user.roles.append(role)

        return self.repository.create(user)

    def authenticate(
        self,
        email: str,
        password: str,
    ) -> User | None:
        user = self.repository.get_by_email(
            email.lower().strip()
        )

        if not user or not verify_password(
            password,
            user.password_hash,
        ):
            return None

        if not user.is_active:
            return None

        return user

    def get_user(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)

        if not user:
            raise NotFoundError(
                "User not found.",
                code="USER_NOT_FOUND",
            )

        return user

    def list_users(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[User], int]:
        return self.repository.list(
            page=page,
            page_size=page_size,
            search=search,
            status=status,
        )

    def update_user(
        self,
        user_id: int,
        *,
        email: str | None = None,
        full_name: str | None = None,
        role_id: int | None = None,
    ) -> User:
        user = self.get_user(user_id)

        if email is not None:
            normalized_email = email.lower().strip()

            existing = self.repository.get_by_email(
                normalized_email
            )

            if existing and existing.id != user.id:
                raise ConflictError(
                    "A user with this email already exists.",
                    code="USER_EMAIL_EXISTS",
                )

            user.email = normalized_email

        if full_name is not None:
            user.full_name = full_name.strip()

        if role_id is not None:
            role = self._get_role(role_id)

            user.roles.clear()
            user.roles.append(role)

        return self.repository.save(user)

    def set_active(
        self,
        user_id: int,
        is_active: bool,
    ) -> User:
        user = self.get_user(user_id)

        if user.is_active == is_active:
            return user

        user.is_active = is_active

        return self.repository.save(user)

    def reset_password(
        self,
        user_id: int,
        password: str,
    ) -> User:
        user = self.get_user(user_id)

        user.password_hash = hash_password(password)

        return self.repository.save(user)

    def delete_user(self, user_id: int) -> None:
        user = self.get_user(user_id)

        self.repository.delete(user)