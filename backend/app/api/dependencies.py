from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.core.security import decode_access_token
from app.models.user import User
from app.services.user import UserService


bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_access_token(credentials.credentials)

    if not user_id:
        raise ForbiddenError(
            "Invalid or expired access token.",
            code="INVALID_TOKEN",
        )

    try:
        user = UserService(db).get_user(int(user_id))
    except (TypeError, ValueError):
        raise ForbiddenError(
            "Invalid access token subject.",
            code="INVALID_TOKEN",
        )

    if not user:
        raise ForbiddenError(
            "User not found.",
            code="USER_NOT_FOUND",
        )

    if not user.is_active:
        raise ForbiddenError(
            "User account is inactive.",
            code="USER_INACTIVE",
        )

    return user


def require_permission(permission_code: str) -> Callable:
    def permission_dependency(
        current_user: User = Depends(get_current_user),
    ) -> User:
        permission_code_normalized = permission_code.strip().upper()

        user_permissions = {
            permission.code
            for role in current_user.roles
            for permission in role.permissions
        }

        if permission_code_normalized not in user_permissions:
            raise ForbiddenError(
                "You do not have permission to perform this action.",
                code="PERMISSION_DENIED",
                details={
                    "permission": permission_code_normalized,
                },
            )

        return current_user

    return permission_dependency