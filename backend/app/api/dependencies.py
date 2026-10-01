from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token_claims
from app.models.session import UserSession
from app.models.user import User
from app.services.user import UserService


bearer_scheme = HTTPBearer()


def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserSession:
    """
    Validate the access token and resolve its active database session.
    """

    token = credentials.credentials

    try:
        claims = decode_access_token_claims(token)
    except Exception as exc:
        raise UnauthorizedError(
            "Invalid or expired authentication token.",
            code="INVALID_TOKEN",
        ) from exc

    user_id_raw = claims.get("sub")
    jti = claims.get("jti")

    if not user_id_raw or not jti:
        raise UnauthorizedError(
            "Authentication token is missing required claims.",
            code="INVALID_TOKEN",
        )

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError(
            "Authentication token contains an invalid user identifier.",
            code="INVALID_TOKEN",
        ) from exc

    session = (
        db.query(UserSession)
        .filter(
            UserSession.jti == jti,
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if session is None:
        raise UnauthorizedError(
            "This session is no longer active. Please log in again.",
            code="SESSION_REVOKED",
        )

    return session


def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolve the authenticated user from the active session.
    """

    user_service = UserService(db)
    user = user_service.get_user(session.user_id)

    if user is None:
        raise UnauthorizedError(
            "Authenticated user no longer exists.",
            code="USER_NOT_FOUND",
        )

    if not user.is_active:
        raise UnauthorizedError(
            "User account is inactive.",
            code="USER_INACTIVE",
        )

    return user


def require_permission(permission_code: str) -> Callable:
    """
    FastAPI dependency factory for permission-based authorization.
    """

    normalized_permission = permission_code.strip().upper()

    if not normalized_permission:
        raise ValueError("permission_code cannot be empty.")

    def permission_dependency(
        current_user: User = Depends(get_current_user),
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


__all__ = [
    "bearer_scheme",
    "get_current_session",
    "get_current_user",
    "require_permission",
]