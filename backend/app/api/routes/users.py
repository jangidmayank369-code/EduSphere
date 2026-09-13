from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.core.exceptions import ConflictError
from app.models.rbac import Role
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserPasswordReset,
    UserResponse,
    UserUpdate,
)
from app.services.audit import AuditService
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["Users"])


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_id": user.roles[0].id if user.roles else None,
        "roles": sorted(role.name for role in user.roles),
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def serialize_user_list(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_id": user.roles[0].id if user.roles else None,
        "roles": sorted(role.name for role in user.roles),
    }


@router.get(
    "/roles",
    response_model=SuccessResponse[list[dict]],
)
def list_user_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("USER_CREATE")),
):
    roles = db.scalars(
        select(Role).order_by(Role.name.asc())
    ).all()

    return {
        "success": True,
        "data": [
            {
                "id": role.id,
                "name": role.name,
                "description": role.description,
            }
            for role in roles
        ],
    }


@router.post(
    "",
    response_model=SuccessResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_CREATE")
    ),
):
    user = UserService(db).create_user(
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
        role_id=payload.role_id,
    )

    AuditService(db).create(
        action="USER_CREATED",
        resource_type="USER",
        resource_id=str(user.id),
        actor_user_id=current_user.id,
        request_id=getattr(
            request.state,
            "request_id",
            None,
        ),
        details={
            "email": user.email,
            "role_id": payload.role_id,
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
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
    _: User = Depends(
        require_permission("USER_READ")
    ),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    if status_filter not in {
        None,
        "active",
        "inactive",
    }:
        status_filter = None

    users, total = UserService(db).list_users(
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
    )

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    return {
        "success": True,
        "data": [
            serialize_user_list(user)
            for user in users
        ],
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
    _: User = Depends(
        require_permission("USER_READ")
    ),
):
    return {
        "success": True,
        "data": serialize_user(
            UserService(db).get_user(user_id)
        ),
    }


@router.patch(
    "/{user_id}",
    response_model=SuccessResponse[UserResponse],
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_UPDATE")
    ),
):
    user = UserService(db).update_user(
        user_id,
        email=payload.email,
        full_name=payload.full_name,
        role_id=payload.role_id,
    )

    AuditService(db).create(
        action="USER_UPDATED",
        resource_type="USER",
        resource_id=str(user.id),
        actor_user_id=current_user.id,
        request_id=getattr(
            request.state,
            "request_id",
            None,
        ),
        details={
            "email": user.email,
            "full_name": user.full_name,
            "role_id": payload.role_id,
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
    }


@router.patch(
    "/{user_id}/status",
    response_model=SuccessResponse[UserResponse],
)
def update_user_status(
    user_id: int,
    request: Request,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_STATUS_UPDATE")
    ),
):
    if current_user.id == user_id and not is_active:
        raise ConflictError(
            "You cannot deactivate your own account.",
            code="USER_SELF_DEACTIVATION",
        )

    user = UserService(db).set_active(
        user_id,
        is_active,
    )

    AuditService(db).create(
        action=(
            "USER_ACTIVATED"
            if is_active
            else "USER_DEACTIVATED"
        ),
        resource_type="USER",
        resource_id=str(user.id),
        actor_user_id=current_user.id,
        request_id=getattr(
            request.state,
            "request_id",
            None,
        ),
        details={
            "is_active": is_active,
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
    }


@router.post(
    "/{user_id}/password",
    response_model=SuccessResponse[UserResponse],
)
def reset_user_password(
    user_id: int,
    payload: UserPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_PASSWORD_RESET")
    ),
):
    user = UserService(db).reset_password(
        user_id,
        payload.password,
    )

    AuditService(db).create(
        action="USER_PASSWORD_RESET",
        resource_type="USER",
        resource_id=str(user.id),
        actor_user_id=current_user.id,
        request_id=getattr(
            request.state,
            "request_id",
            None,
        ),
        details={
            "target_user_id": user.id,
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
    }


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse[dict],
)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_DELETE")
    ),
):
    if current_user.id == user_id:
        raise ConflictError(
            "You cannot delete your own account.",
            code="USER_SELF_DELETION",
        )

    UserService(db).delete_user(user_id)

    AuditService(db).create(
        action="USER_DELETED",
        resource_type="USER",
        resource_id=str(user_id),
        actor_user_id=current_user.id,
        request_id=getattr(
            request.state,
            "request_id",
            None,
        ),
        details={
            "target_user_id": user_id,
        },
    )

    return {
        "success": True,
        "data": {
            "message": "User deleted successfully.",
        },
    }