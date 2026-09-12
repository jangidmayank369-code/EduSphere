from collections.abc import Callable

from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.models.user import User
from app.services.rbac import RBACService


def require_permission(permission_code: str) -> Callable:
    """
    Create a FastAPI dependency that requires a specific permission.
    """

    normalized_code = permission_code.strip().upper()

    def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        permissions = RBACService(db).get_user_permissions(
            current_user.id
        )

        if normalized_code not in permissions:
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                code="PERMISSION_DENIED",
                details={
                    "required_permission": normalized_code,
                },
            )

        return current_user

    return permission_dependency