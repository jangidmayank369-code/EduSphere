from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.rbac import Role
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.session import SessionService


class UserService:
    """
    Business logic for the User / Identity module.

    Responsibilities:
    - User creation and authentication
    - User lookup and filtered listing
    - Profile updates
    - Role assignment through the legacy single-role API
    - Account activation/deactivation
    - Password reset
    - Authentication-session invalidation
    - User deletion

    Authorization, audit logging and HTTP concerns remain in the API layer.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)
        self.session_service = SessionService(db)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_email(email: str) -> str:
        return str(email or "").strip().lower()

    @staticmethod
    def _normalize_name(full_name: str) -> str:
        return " ".join(str(full_name or "").strip().split())

    @staticmethod
    def _normalize_password(password: str) -> str:
        # Passwords must not be silently trimmed because leading/trailing
        # spaces can legitimately be part of a password.
        return str(password or "")

    def _get_role(self, role_id: int) -> Role:
        """
        Return an existing role suitable for assignment.

        The current Role model does not contain an is_active field, so role
        availability is determined by whether the role exists. Any future
        role lifecycle field can be incorporated here without changing the
        UserService public contract.
        """

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

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create_user(
        self,
        email: str,
        full_name: str,
        password: str,
        role_id: int,
    ) -> User:
        normalized_email = self._normalize_email(email)
        normalized_name = self._normalize_name(full_name)
        normalized_password = self._normalize_password(password)

        if not normalized_email:
            raise ConflictError(
                "Email is required.",
                code="USER_EMAIL_REQUIRED",
            )

        if not normalized_name:
            raise ConflictError(
                "Full name is required.",
                code="USER_NAME_REQUIRED",
            )

        if not normalized_password:
            raise ConflictError(
                "Password is required.",
                code="USER_PASSWORD_REQUIRED",
            )

        if self.repository.get_by_email(normalized_email):
            raise ConflictError(
                "A user with this email already exists.",
                code="USER_EMAIL_EXISTS",
            )

        role = self._get_role(role_id)

        user = User(
            email=normalized_email,
            full_name=normalized_name,
            password_hash=hash_password(normalized_password),
            is_active=True,
        )

        user.roles.append(role)

        return self.repository.create(user)

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def authenticate(
        self,
        email: str,
        password: str,
    ) -> User | None:
        normalized_email = self._normalize_email(email)
        normalized_password = self._normalize_password(password)

        if not normalized_email or not normalized_password:
            return None

        user = self.repository.get_by_email(normalized_email)

        if not user:
            return None

        if not verify_password(
            normalized_password,
            user.password_hash,
        ):
            return None

        if not user.is_active:
            return None

        return user

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_user(
        self,
        user_id: int,
    ) -> User:
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
        """
        Return a paginated user list.

        Pagination bounds are normally enforced by the API layer, but the
        service also protects itself against invalid direct callers.
        """

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 1
        elif page_size > 100:
            page_size = 100

        normalized_status = (
            str(status).strip().lower()
            if status is not None
            else None
        )

        if normalized_status not in {
            None,
            "active",
            "inactive",
        }:
            raise ConflictError(
                "Status filter must be active or inactive.",
                code="INVALID_USER_STATUS_FILTER",
            )

        normalized_search = (
            str(search).strip()
            if search is not None
            else None
        )

        if normalized_search == "":
            normalized_search = None

        return self.repository.list(
            page=page,
            page_size=page_size,
            search=normalized_search,
            status=normalized_status,
        )

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

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
            normalized_email = self._normalize_email(email)

            if not normalized_email:
                raise ConflictError(
                    "Email cannot be empty.",
                    code="USER_EMAIL_REQUIRED",
                )

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
            normalized_name = self._normalize_name(
                full_name
            )

            if not normalized_name:
                raise ConflictError(
                    "Full name cannot be empty.",
                    code="USER_NAME_REQUIRED",
                )

            user.full_name = normalized_name

        # ------------------------------------------------------------------
        # Backward-compatible single-role update
        # ------------------------------------------------------------------

        # Full multi-role management remains handled by the RBAC module:
        #
        # POST   /rbac/users/{user_id}/roles
        # DELETE /rbac/users/{user_id}/roles/{role_id}
        #
        # This method intentionally keeps the existing role_id contract
        # used by the current Users API.

        if role_id is not None:
            role = self._get_role(role_id)

            current_role_ids = {
                role_item.id
                for role_item in user.roles
            }

            if current_role_ids != {role.id}:
                user.roles.clear()
                user.roles.append(role)

        return self.repository.save(user)

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    def set_active(
        self,
        user_id: int,
        is_active: bool,
    ) -> User:
        user = self.get_user(user_id)

        desired_state = bool(is_active)

        if user.is_active == desired_state:
            return user

        user.is_active = desired_state

        # Deactivation immediately invalidates every existing
        # authentication session for this account.
        if not desired_state:
            self.session_service.revoke_for_user(
                user.id
            )

        return self.repository.save(user)

    # ------------------------------------------------------------------
    # Bulk operations
    # ------------------------------------------------------------------

    def _get_bulk_users(
        self,
        user_ids: list[int],
    ) -> list[User]:
        normalized_ids = sorted(
            {
                int(user_id)
                for user_id in user_ids
                if int(user_id) > 0
            }
        )

        if not normalized_ids:
            raise ConflictError(
                "At least one valid user ID is required.",
                code="BULK_USERS_REQUIRED",
            )

        users = list(
            self.db.scalars(
                select(User)
                .where(User.id.in_(normalized_ids))
                .order_by(User.id.asc())
            ).all()
        )

        found_ids = {user.id for user in users}
        missing_ids = [
            user_id
            for user_id in normalized_ids
            if user_id not in found_ids
        ]

        if missing_ids:
            raise NotFoundError(
                "One or more selected users were not found.",
                code="USER_NOT_FOUND",
                details={"missing_user_ids": missing_ids},
            )

        return users

    def bulk_set_active(
        self,
        user_ids: list[int],
        is_active: bool,
        *,
        commit: bool = True,
    ) -> list[User]:
        users = self._get_bulk_users(user_ids)
        desired_state = bool(is_active)

        for user in users:
            if user.is_active == desired_state:
                continue

            user.is_active = desired_state

            if not desired_state:
                self.session_service.revoke_for_user(
                    user.id,
                    commit=False,
                )

        self.db.flush()

        if commit:
            self.db.commit()
            for user in users:
                self.db.refresh(user)

        return users

    def bulk_assign_role(
        self,
        user_ids: list[int],
        role_id: int,
        *,
        commit: bool = True,
    ) -> list[User]:
        users = self._get_bulk_users(user_ids)
        role = self._get_role(role_id)

        for user in users:
            current_role_ids = {
                role_item.id
                for role_item in user.roles
            }

            if current_role_ids == {role.id}:
                continue

            user.roles.clear()
            user.roles.append(role)

        self.db.flush()

        if commit:
            self.db.commit()
            for user in users:
                self.db.refresh(user)

        return users

    def bulk_delete(
        self,
        user_ids: list[int],
        *,
        commit: bool = True,
    ) -> list[int]:
        users = self._get_bulk_users(user_ids)
        deleted_ids = [user.id for user in users]

        for user in users:
            self.session_service.revoke_for_user(
                user.id,
                commit=False,
            )

        for user in users:
            self.db.delete(user)

        self.db.flush()

        if commit:
            self.db.commit()

        return deleted_ids

    # ------------------------------------------------------------------
    # Password
    # ------------------------------------------------------------------

    def reset_password(
        self,
        user_id: int,
        password: str,
    ) -> User:
        user = self.get_user(user_id)

        normalized_password = self._normalize_password(password)

        if not normalized_password:
            raise ConflictError(
                "Password is required.",
                code="USER_PASSWORD_REQUIRED",
            )

        user.password_hash = hash_password(
            normalized_password
        )

        # A password change invalidates all existing sessions so that
        # previously issued access tokens cannot continue to authenticate
        # through the session-control layer.
        self.session_service.revoke_for_user(
            user.id
        )

        return self.repository.save(user)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_user(
        self,
        user_id: int,
    ) -> None:
        user = self.get_user(user_id)

        # Revoke authentication sessions before deleting the account.
        self.session_service.revoke_for_user(
            user.id
        )

        self.repository.delete(user)