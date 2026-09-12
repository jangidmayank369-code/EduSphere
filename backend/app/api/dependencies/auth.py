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
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_access_token(credentials.credentials)

    if not user_id:
        raise ForbiddenError(
            "Invalid or expired access token.",
            code="INVALID_TOKEN",
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise ForbiddenError(
            "Invalid access token subject.",
            code="INVALID_TOKEN",
        )

    user = UserService(db).get_user(user_id_int)

    if not user.is_active:
        raise ForbiddenError(
            "User account is inactive.",
            code="USER_INACTIVE",
        )

    return user