from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.rbac import Permission, Role
from app.repositories.rbac import RBACRepository


class RBACService:
    """
    Business logic for Role-Based Access Control.

    Rules:
    - Role names are normalized and unique.
    - Permission codes are normalized and unique.
    - A role cannot be deleted while assigned to users.
    - A permission cannot be deleted while assigned to roles.
    - A user must retain at least one role.
    - Duplicate assignments are rejected.
    - List methods keep the existing API contract and return lists,
      while pagination is handled internally by the repository.
    """

    DEFAULT_LIST_PAGE = 1
    DEFAULT_ROLE_PAGE_SIZE = 100
    DEFAULT_PERMISSION_PAGE_SIZE = 200

    def __init__(self, db: Session):
        self.repository = RBACRepository(db)

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    def create_role(
        self,
        name: str,
        description: str | None = None,
    ) -> Role:
        name = name.strip()

        if not name:
            raise ConflictError(
                "Role name cannot be empty.",
                code="ROLE_NAME_REQUIRED",
            )

        if self.repository.get_role_by_name(name):
            raise ConflictError(
                "A role with this name already exists.",
                code="ROLE_EXISTS",
            )

        if description is not None:
            description = description.strip() or None

        return self.repository.create_role(
            Role(
                name=name,
                description=description,
            )
        )

    def get_role(
        self,
        role_id: int,
    ) -> Role:
        role = self.repository.get_role_by_id(role_id)

        if not role:
            raise NotFoundError(
                "Role not found.",
                code="ROLE_NOT_FOUND",
            )

        return role

    def list_roles(
        self,
        *,
        page: int = DEFAULT_LIST_PAGE,
        page_size: int = DEFAULT_ROLE_PAGE_SIZE,
    ) -> list[Role]:
        """
        Return roles as a plain list.

        The existing RBAC API expects:
            {"success": True, "data": [...]}

        The repository returns:
            (items, total)

        We intentionally keep the service/API contract list-based while
        allowing the repository to remain pagination-aware.
        """
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        roles, _total = self.repository.list_roles(
            page=page,
            page_size=page_size,
        )

        return roles

    def update_role(
        self,
        role_id: int,
        *,
        name: str | None = None,
        description: str | None = None,
    ) -> Role:
        role = self.get_role(role_id)

        if name is not None:
            normalized_name = name.strip()

            if not normalized_name:
                raise ConflictError(
                    "Role name cannot be empty.",
                    code="ROLE_NAME_REQUIRED",
                )

            existing = self.repository.get_role_by_name(
                normalized_name
            )

            if existing and existing.id != role.id:
                raise ConflictError(
                    "A role with this name already exists.",
                    code="ROLE_EXISTS",
                )

            role.name = normalized_name

        if description is not None:
            role.description = description.strip() or None

        return self.repository.save_role(role)

    def delete_role(
        self,
        role_id: int,
    ) -> None:
        role = self.get_role(role_id)

        user_count = self.repository.count_users_for_role(
            role.id
        )

        if user_count > 0:
            raise ConflictError(
                "This role cannot be deleted because it is assigned "
                f"to {user_count} user(s). Remove the role from all "
                "users first.",
                code="ROLE_IN_USE",
            )

        self.repository.delete_role(role)

    # ------------------------------------------------------------------
    # Permissions
    # ------------------------------------------------------------------

    def create_permission(
        self,
        code: str,
        description: str | None = None,
    ) -> Permission:
        code = code.strip().upper()

        if not code:
            raise ConflictError(
                "Permission code cannot be empty.",
                code="PERMISSION_CODE_REQUIRED",
            )

        if self.repository.get_permission_by_code(code):
            raise ConflictError(
                "A permission with this code already exists.",
                code="PERMISSION_EXISTS",
            )

        if description is not None:
            description = description.strip() or None

        return self.repository.create_permission(
            Permission(
                code=code,
                description=description,
            )
        )

    def get_permission(
        self,
        permission_id: int,
    ) -> Permission:
        permission = self.repository.get_permission_by_id(
            permission_id
        )

        if not permission:
            raise NotFoundError(
                "Permission not found.",
                code="PERMISSION_NOT_FOUND",
            )

        return permission

    def list_permissions(
        self,
        *,
        page: int = DEFAULT_LIST_PAGE,
        page_size: int = DEFAULT_PERMISSION_PAGE_SIZE,
    ) -> list[Permission]:
        """
        Return permissions as a plain list.

        The existing RBAC API expects:
            {"success": True, "data": [...]}

        The repository returns:
            (items, total)

        Keep the public service contract list-based.
        """
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        permissions, _total = self.repository.list_permissions(
            page=page,
            page_size=page_size,
        )

        return permissions

    def update_permission(
        self,
        permission_id: int,
        *,
        code: str | None = None,
        description: str | None = None,
    ) -> Permission:
        permission = self.get_permission(permission_id)

        if code is not None:
            normalized_code = code.strip().upper()

            if not normalized_code:
                raise ConflictError(
                    "Permission code cannot be empty.",
                    code="PERMISSION_CODE_REQUIRED",
                )

            existing = self.repository.get_permission_by_code(
                normalized_code
            )

            if existing and existing.id != permission.id:
                raise ConflictError(
                    "A permission with this code already exists.",
                    code="PERMISSION_EXISTS",
                )

            permission.code = normalized_code

        if description is not None:
            permission.description = (
                description.strip() or None
            )

        return self.repository.save_permission(
            permission
        )

    def delete_permission(
        self,
        permission_id: int,
    ) -> None:
        permission = self.get_permission(permission_id)

        role_count = self.repository.count_roles_for_permission(
            permission.id
        )

        if role_count > 0:
            raise ConflictError(
                "This permission cannot be deleted because it is "
                f"assigned to {role_count} role(s). Remove it from "
                "all roles first.",
                code="PERMISSION_IN_USE",
            )

        self.repository.delete_permission(permission)

    # ------------------------------------------------------------------
    # User ↔ Role
    # ------------------------------------------------------------------

    def assign_role(
        self,
        user_id: int,
        role_id: int,
    ):
        user = self.repository.get_user(user_id)

        if not user:
            raise NotFoundError(
                "User not found.",
                code="USER_NOT_FOUND",
            )

        role = self.get_role(role_id)

        if role in user.roles:
            raise ConflictError(
                "Role is already assigned to this user.",
                code="ROLE_ALREADY_ASSIGNED",
            )

        user.roles.append(role)

        return self.repository.save_user(user)

    def remove_role(
        self,
        user_id: int,
        role_id: int,
    ):
        user = self.repository.get_user(user_id)

        if not user:
            raise NotFoundError(
                "User not found.",
                code="USER_NOT_FOUND",
            )

        role = self.get_role(role_id)

        if role not in user.roles:
            raise NotFoundError(
                "Role is not assigned to this user.",
                code="ROLE_NOT_ASSIGNED",
            )

        if len(user.roles) <= 1:
            raise ConflictError(
                "A user must have at least one assigned role.",
                code="LAST_ROLE_CANNOT_BE_REMOVED",
            )

        user.roles.remove(role)

        return self.repository.save_user(user)

    # ------------------------------------------------------------------
    # Role ↔ Permission
    # ------------------------------------------------------------------

    def assign_permission(
        self,
        role_id: int,
        permission_id: int,
    ):
        role = self.get_role(role_id)

        permission = self.get_permission(permission_id)

        if permission in role.permissions:
            raise ConflictError(
                "Permission is already assigned to this role.",
                code="PERMISSION_ALREADY_ASSIGNED",
            )

        role.permissions.append(permission)

        return self.repository.save_role(role)

    def remove_permission(
        self,
        role_id: int,
        permission_id: int,
    ):
        role = self.get_role(role_id)

        permission = self.get_permission(permission_id)

        if permission not in role.permissions:
            raise NotFoundError(
                "Permission is not assigned to this role.",
                code="PERMISSION_NOT_ASSIGNED",
            )

        role.permissions.remove(permission)

        return self.repository.save_role(role)

    # ------------------------------------------------------------------
    # Effective user permissions
    # ------------------------------------------------------------------

    def get_user_permissions(
        self,
        user_id: int,
    ) -> list[str]:
        user = self.repository.get_user(user_id)

        if not user:
            raise NotFoundError(
                "User not found.",
                code="USER_NOT_FOUND",
            )

        permissions = {
            permission.code.strip().upper()
            for role in user.roles
            for permission in role.permissions
        }

        return sorted(permissions)