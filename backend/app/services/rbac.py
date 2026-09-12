from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.rbac import Permission, Role
from app.repositories.rbac import RBACRepository


class RBACService:
    def __init__(self, db: Session):
        self.repository = RBACRepository(db)

    def create_role(
        self,
        name: str,
        description: str | None = None,
    ) -> Role:
        name = name.strip()

        if self.repository.get_role_by_name(name):
            raise ConflictError(
                "A role with this name already exists.",
                code="ROLE_EXISTS",
            )

        return self.repository.create_role(
            Role(
                name=name,
                description=description,
            )
        )

    def get_role(self, role_id: int) -> Role:
        role = self.repository.get_role_by_id(role_id)

        if not role:
            raise NotFoundError(
                "Role not found.",
                code="ROLE_NOT_FOUND",
            )

        return role

    def list_roles(self) -> list[Role]:
        return self.repository.list_roles()

    def create_permission(
        self,
        code: str,
        description: str | None = None,
    ) -> Permission:
        code = code.strip().upper()

        if self.repository.get_permission_by_code(code):
            raise ConflictError(
                "A permission with this code already exists.",
                code="PERMISSION_EXISTS",
            )

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

    def list_permissions(self) -> list[Permission]:
        return self.repository.list_permissions()

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

        return self.repository.save(user)

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

        user.roles.remove(role)

        return self.repository.save(user)

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

        return self.repository.save(role)

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

        return self.repository.save(role)

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
            permission.code
            for role in user.roles
            for permission in role.permissions
        }

        return sorted(permissions)