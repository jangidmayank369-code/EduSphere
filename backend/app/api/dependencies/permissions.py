from collections.abc import Callable

from fastapi import Depends

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import ForbiddenError
from app.models.user import User


def require_permission(
    permission_code: str,
) -> Callable:
    """
    Require an authenticated user with the specified
    role-derived permission.
    """

    normalized_permission = (
        permission_code.strip().upper()
    )

    if not normalized_permission:
        raise ValueError(
            "permission_code cannot be empty."
        )

    def permission_dependency(
        current_user: User = Depends(
            get_current_user
        ),
    ) -> User:
        user_permissions = {
            permission.code.strip().upper()
            for role in current_user.roles
            for permission in role.permissions
        }

        if normalized_permission not in user_permissions:
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                code="PERMISSION_DENIED",
                details={
                    "permission": normalized_permission,
                },
            )

        return current_user

    return permission_dependency