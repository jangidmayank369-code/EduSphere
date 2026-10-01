from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.rbac import (
    Permission,
    Role,
    role_permissions,
    user_roles,
)
from app.models.user import User


class RBACRepository:
    """
    Repository for RBAC entities and assignments.

    Public list methods return:
        (items, total)

    The service layer can keep the existing list-based API contract while
    still using repository-level pagination.
    """

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    def get_role_by_id(self, role_id: int) -> Role | None:
        """
        Get a role by primary key with permissions eagerly loaded.
        """
        stmt = (
            select(Role)
            .where(Role.id == role_id)
            .options(selectinload(Role.permissions))
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def get_role(self, role_id: int) -> Role | None:
        """
        Backward-compatible alias.
        """
        return self.get_role_by_id(role_id)

    def get_role_by_name(self, name: str) -> Role | None:
        stmt = (
            select(Role)
            .where(func.lower(Role.name) == name.strip().lower())
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def list_roles(
        self,
        *,
        page: int = 1,
        page_size: int = 100,
        search: str | None = None,
    ) -> tuple[list[Role], int]:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        filters = []

        if search:
            search_value = search.strip()
            if search_value:
                filters.append(
                    Role.name.ilike(f"%{search_value}%")
                )

        count_stmt = select(func.count(Role.id))

        if filters:
            count_stmt = count_stmt.where(*filters)

        total = self.db.execute(count_stmt).scalar_one()

        stmt = (
            select(Role)
            .options(selectinload(Role.permissions))
            .order_by(Role.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        if filters:
            stmt = stmt.where(*filters)

        roles = list(
            self.db.execute(stmt)
            .scalars()
            .unique()
            .all()
        )

        return roles, total

    def create_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)

        # Make sure relationships are available after commit.
        return self.get_role_by_id(role.id) or role

    def save_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)

        return self.get_role_by_id(role.id) or role

    def delete_role(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()

    # ------------------------------------------------------------------
    # Role safety / counts
    # ------------------------------------------------------------------

    def count_users_for_role(self, role_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(user_roles)
            .where(user_roles.c.role_id == role_id)
        )

        return int(self.db.execute(stmt).scalar_one())

    def count_permissions_for_role(self, role_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(role_permissions)
            .where(role_permissions.c.role_id == role_id)
        )

        return int(self.db.execute(stmt).scalar_one())

    # ------------------------------------------------------------------
    # Permissions
    # ------------------------------------------------------------------

    def get_permission_by_id(
        self,
        permission_id: int,
    ) -> Permission | None:
        stmt = (
            select(Permission)
            .where(Permission.id == permission_id)
            .options(selectinload(Permission.roles))
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def get_permission(
        self,
        permission_id: int,
    ) -> Permission | None:
        """
        Backward-compatible alias.
        """
        return self.get_permission_by_id(permission_id)

    def get_permission_by_code(
        self,
        code: str,
    ) -> Permission | None:
        stmt = (
            select(Permission)
            .where(
                func.upper(Permission.code)
                == code.strip().upper()
            )
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def list_permissions(
        self,
        *,
        page: int = 1,
        page_size: int = 200,
        search: str | None = None,
    ) -> tuple[list[Permission], int]:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)

        filters = []

        if search:
            search_value = search.strip()

            if search_value:
                filters.append(
                    (
                        Permission.code.ilike(
                            f"%{search_value}%"
                        )
                        | Permission.description.ilike(
                            f"%{search_value}%"
                        )
                    )
                )

        count_stmt = select(func.count(Permission.id))

        if filters:
            count_stmt = count_stmt.where(*filters)

        total = self.db.execute(count_stmt).scalar_one()

        stmt = (
            select(Permission)
            .options(selectinload(Permission.roles))
            .order_by(Permission.code.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        if filters:
            stmt = stmt.where(*filters)

        permissions = list(
            self.db.execute(stmt)
            .scalars()
            .unique()
            .all()
        )

        return permissions, total

    def create_permission(
        self,
        permission: Permission,
    ) -> Permission:
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)

        return (
            self.get_permission_by_id(permission.id)
            or permission
        )

    def save_permission(
        self,
        permission: Permission,
    ) -> Permission:
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)

        return (
            self.get_permission_by_id(permission.id)
            or permission
        )

    def delete_permission(
        self,
        permission: Permission,
    ) -> None:
        self.db.delete(permission)
        self.db.commit()

    # ------------------------------------------------------------------
    # Permission safety / counts
    # ------------------------------------------------------------------

    def count_roles_for_permission(
        self,
        permission_id: int,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(role_permissions)
            .where(
                role_permissions.c.permission_id
                == permission_id
            )
        )

        return int(self.db.execute(stmt).scalar_one())

    # ------------------------------------------------------------------
    # User
    # ------------------------------------------------------------------

    def get_user(self, user_id: int) -> User | None:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.roles).selectinload(
                    Role.permissions
                )
            )
        )

        return self.db.execute(stmt).scalar_one_or_none()

    def save_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return self.get_user(user.id) or user

    # ------------------------------------------------------------------
    # User ↔ Role
    # ------------------------------------------------------------------

    def assign_role_to_user(
        self,
        user: User,
        role: Role,
    ) -> User:
        if role not in user.roles:
            user.roles.append(role)

        return self.save_user(user)

    def remove_role_from_user(
        self,
        user: User,
        role: Role,
    ) -> User:
        if role in user.roles:
            user.roles.remove(role)

        return self.save_user(user)

    def replace_user_roles(
        self,
        user: User,
        roles: list[Role],
    ) -> User:
        user.roles = list(roles)

        return self.save_user(user)

    # ------------------------------------------------------------------
    # Role ↔ Permission
    # ------------------------------------------------------------------

    def assign_permission_to_role(
        self,
        role: Role,
        permission: Permission,
    ) -> Role:
        if permission not in role.permissions:
            role.permissions.append(permission)

        return self.save_role(role)

    def remove_permission_from_role(
        self,
        role: Role,
        permission: Permission,
    ) -> Role:
        if permission in role.permissions:
            role.permissions.remove(permission)

        return self.save_role(role)

    def replace_role_permissions(
        self,
        role: Role,
        permissions: list[Permission],
    ) -> Role:
        role.permissions = list(permissions)

        return self.save_role(role)