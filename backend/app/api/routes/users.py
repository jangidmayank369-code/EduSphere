from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import (
    PaginatedResponse,
    SuccessResponse,
)
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.services.user import UserService


router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "",
    response_model=SuccessResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    user = UserService(db).create_user(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
    )

    return {
        "success": True,
        "data": user,
    }


@router.get(
    "",
    response_model=PaginatedResponse[UserListResponse],
)
def list_users(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
):
    users, total = UserService(db).list_users(
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "success": True,
        "data": users,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/{user_id}",
    response_model=SuccessResponse[UserResponse],
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        "data": UserService(db).get_user(user_id),
    }


@router.patch(
    "/{user_id}",
    response_model=SuccessResponse[UserResponse],
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
):
    user = UserService(db).update_user(
        user_id,
        email=payload.email,
        full_name=payload.full_name,
    )

    return {
        "success": True,
        "data": user,
    }


@router.patch(
    "/{user_id}/status",
    response_model=SuccessResponse[UserResponse],
)
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
):
    user = UserService(db).set_active(
        user_id,
        is_active,
    )

    return {
        "success": True,
        "data": user,
    }


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse[dict],
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    UserService(db).delete_user(user_id)

    return {
        "success": True,
        "data": {
            "message": "User deleted successfully.",
        },
    }