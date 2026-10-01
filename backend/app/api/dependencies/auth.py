from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.core.security import decode_access_token_claims
from app.models.session import UserSession
from app.models.user import User
from app.services.user import UserService


bearer_scheme = HTTPBearer()


def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> UserSession:
    claims = decode_access_token_claims(
        credentials.credentials
    )

    if not claims:
        raise ForbiddenError(
            "Invalid or expired access token.",
            code="INVALID_TOKEN",
        )

    user_id = claims.get("sub")
    jti = claims.get("jti")

    if not user_id or not jti:
        raise ForbiddenError(
            "Invalid access token.",
            code="INVALID_TOKEN",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise ForbiddenError(
            "Invalid access token subject.",
            code="INVALID_TOKEN",
        )

    session = (
        db.query(UserSession)
        .filter(
            UserSession.jti == jti,
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at
            > datetime.now(timezone.utc),
        )
        .first()
    )

    if not session:
        raise ForbiddenError(
            "This session has been revoked or expired.",
            code="SESSION_REVOKED",
        )

    return session


def get_current_user(
    current_session: UserSession = Depends(
        get_current_session
    ),
    db: Session = Depends(get_db),
) -> User:
    user = UserService(db).get_user(
        current_session.user_id
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