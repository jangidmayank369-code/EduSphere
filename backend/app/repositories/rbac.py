from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rbac import Permission, Role
from app.models.user import User


class RBACRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_role_by_id(self, role_id: int) -> Role | None:
        return self.db.get(Role, role_id)

    def get_role_by_name(self, name: str) -> Role | None:
        return self.db.scalar(
            select(Role).where(Role.name == name)
        )

    def list_roles(self) -> list[Role]:
        return list(
            self.db.scalars(
                select(Role).order_by(Role.name)
            ).all()
        )

    def create_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def get_permission_by_id(
        self,
        permission_id: int,
    ) -> Permission | None:
        return self.db.get(Permission, permission_id)

    def get_permission_by_code(
        self,
        code: str,
    ) -> Permission | None:
        return self.db.scalar(
            select(Permission).where(Permission.code == code)
        )

    def list_permissions(self) -> list[Permission]:
        return list(
            self.db.scalars(
                select(Permission).order_by(Permission.code)
            ).all()
        )

    def create_permission(
        self,
        permission: Permission,
    ) -> Permission:
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        return permission

    def get_user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def save(self, entity):
        self.db.commit()
        self.db.refresh(entity)
        return entity