from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.core.security import create_access_token, decode_access_token
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.user import UserService


router = APIRouter(prefix="/auth", tags=["Authentication"])

bearer_scheme = HTTPBearer()


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    user = UserService(db).authenticate(
        email=payload.email,
        password=payload.password,
    )

    if not user:
        raise ForbiddenError(
            "Invalid email or password.",
            code="INVALID_CREDENTIALS",
        )

    token = create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
):
    user_id = decode_access_token(credentials.credentials)

    if not user_id:
        raise ForbiddenError(
            "Invalid or expired access token.",
            code="INVALID_TOKEN",
        )

    user = UserService(db).get_user(int(user_id))

    if not user.is_active:
        raise ForbiddenError(
            "User account is inactive.",
            code="USER_INACTIVE",
        )

    return user