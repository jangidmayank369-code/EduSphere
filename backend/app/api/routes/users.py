from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
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
    UserStatusUpdate,
    UserUpdate,
)
from app.services.audit import AuditService
from app.services.user import UserService


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ---------------------------------------------------------------------------
# Bulk request schemas
# ---------------------------------------------------------------------------


class BulkUserRequest(BaseModel):
    user_ids: list[int] = Field(
        ...,
        min_length=1,
        max_length=500,
    )


class BulkUserStatusRequest(BulkUserRequest):
    is_active: bool


class BulkUserRoleRequest(BulkUserRequest):
    role_id: int = Field(..., gt=0)


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------


def serialize_user(user: User) -> dict:
    roles = sorted(
        {
            role.name
            for role in user.roles
            if role.name
        }
    )

    role_ids = sorted(
        {
            role.id
            for role in user.roles
        }
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_id": role_ids[0] if role_ids else None,
        "roles": roles,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def serialize_user_list(user: User) -> dict:
    roles = sorted(
        {
            role.name
            for role in user.roles
            if role.name
        }
    )

    role_ids = sorted(
        {
            role.id
            for role in user.roles
        }
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_id": role_ids[0] if role_ids else None,
        "roles": roles,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def normalize_user_ids(user_ids: list[int]) -> list[int]:
    """
    Normalize, deduplicate and validate bulk user IDs.
    """
    normalized: list[int] = []

    for user_id in user_ids:
        try:
            value = int(user_id)
        except (TypeError, ValueError):
            continue

        if value > 0 and value not in normalized:
            normalized.append(value)

    if not normalized:
        raise ConflictError(
            "At least one valid user ID is required.",
            code="INVALID_USER_IDS",
        )

    return normalized


def get_bulk_users(
    db: Session,
    user_ids: list[int],
) -> list[User]:
    """
    Load all requested users.

    The endpoint intentionally fails if even one requested user does not
    exist. This prevents silent partial bulk operations.
    """
    normalized_ids = normalize_user_ids(user_ids)

    users = list(
        db.scalars(
            select(User)
            .where(User.id.in_(normalized_ids))
            .order_by(User.id.asc())
        ).all()
    )

    found_ids = {user.id for user in users}
    missing_ids = [
        user_id
        for user_id in normalized_ids
        if user_id not in found_ids
    ]

    if missing_ids:
        raise ConflictError(
            f"One or more users were not found: {missing_ids}",
            code="BULK_USERS_NOT_FOUND",
            details={
                "missing_user_ids": missing_ids,
            },
        )

    return users


# ---------------------------------------------------------------------------
# Roles available for user creation / assignment
# ---------------------------------------------------------------------------


@router.get(
    "/roles",
    response_model=SuccessResponse[list[dict]],
)
def list_assignable_roles(
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission("RBAC_ROLE_ASSIGN")
    ),
):
    roles = list(
        db.scalars(
            select(Role)
            .order_by(Role.name.asc())
        ).all()
    )

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


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


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
        email=str(payload.email),
        full_name=payload.full_name,
        password=payload.password,
        role_id=payload.role_id,
    )

    AuditService(db).create(
        action="USER_CREATED",
        resource_type="USER",
        actor_user_id=current_user.id,
        resource_id=str(user.id),
        request_id=request.headers.get("X-Request-ID"),
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


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=PaginatedResponse[UserListResponse],
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None),
    _: User = Depends(
        require_permission("USER_VIEW")
    ),
    db: Session = Depends(get_db),
):
    normalized_status = None

    if status_filter is not None:
        normalized_status = status_filter.strip().lower()

        if normalized_status not in {
            "active",
            "inactive",
        }:
            raise ConflictError(
                "Status filter must be active or inactive.",
                code="INVALID_USER_STATUS_FILTER",
            )

    users, total = UserService(db).list_users(
        page=page,
        page_size=page_size,
        search=search,
        status=normalized_status,
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


# ---------------------------------------------------------------------------
# Bulk status
# IMPORTANT: Keep this before /{user_id} routes.
# ---------------------------------------------------------------------------


@router.patch(
    "/bulk/status",
    response_model=SuccessResponse[dict],
)
def bulk_update_user_status(
    payload: BulkUserStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_STATUS_UPDATE")
    ),
):
    user_ids = normalize_user_ids(payload.user_ids)

    if current_user.id in user_ids and not payload.is_active:
        raise ConflictError(
            "You cannot deactivate your own account.",
            code="SELF_DEACTIVATION_FORBIDDEN",
        )

    service = UserService(db)

    try:
        users = service.bulk_set_active(
            user_ids,
            payload.is_active,
            commit=False,
        )

        updated_ids = [
            user.id
            for user in users
            if user.is_active == payload.is_active
        ]

        unchanged_ids = [
            user.id
            for user in users
            if user.id not in updated_ids
        ]

        action = (
            "USER_ACTIVATED"
            if payload.is_active
            else "USER_DEACTIVATED"
        )

        for user in users:
            if user.id in unchanged_ids:
                continue

            AuditService(db).create(
                action=action,
                resource_type="USER",
                actor_user_id=current_user.id,
                resource_id=str(user.id),
                request_id=request.headers.get("X-Request-ID"),
                details={
                    "bulk_operation": True,
                    "is_active": payload.is_active,
                    "sessions_revoked": not payload.is_active,
                },
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "data": {
            "operation": "STATUS_UPDATE",
            "requested": len(user_ids),
            "updated": len(updated_ids),
            "unchanged": len(unchanged_ids),
            "updated_user_ids": updated_ids,
            "unchanged_user_ids": unchanged_ids,
            "is_active": payload.is_active,
        },
    }

# ---------------------------------------------------------------------------
# Bulk role assignment
# IMPORTANT: Keep this before /{user_id} routes.
# ---------------------------------------------------------------------------


@router.patch(
    "/bulk/role",
    response_model=SuccessResponse[dict],
)
def bulk_assign_user_role(
    payload: BulkUserRoleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_ASSIGN")
    ),
):
    user_ids = normalize_user_ids(payload.user_ids)

    service = UserService(db)

    try:
        # Validate every selected user and the target role before mutation.
        users = service._get_bulk_users(user_ids)
        role = service._get_role(payload.role_id)

        unchanged_ids: list[int] = []
        changed_ids: list[int] = []

        for user in users:
            current_role_ids = {
                existing_role.id
                for existing_role in user.roles
            }

            if current_role_ids == {role.id}:
                unchanged_ids.append(user.id)

        service.bulk_assign_role(
            user_ids,
            payload.role_id,
            commit=False,
        )

        changed_ids = [
            user.id
            for user in users
            if user.id not in unchanged_ids
        ]

        for user_id in changed_ids:
            AuditService(db).create(
                action="USER_ROLE_UPDATED",
                resource_type="USER",
                actor_user_id=current_user.id,
                resource_id=str(user_id),
                request_id=request.headers.get("X-Request-ID"),
                details={
                    "bulk_operation": True,
                    "role_id": role.id,
                    "role_name": role.name,
                },
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "data": {
            "operation": "ROLE_ASSIGNMENT",
            "requested": len(user_ids),
            "updated": len(changed_ids),
            "unchanged": len(unchanged_ids),
            "updated_user_ids": changed_ids,
            "unchanged_user_ids": unchanged_ids,
            "role": {
                "id": role.id,
                "name": role.name,
            },
        },
    }

# ---------------------------------------------------------------------------
# Bulk delete
# IMPORTANT: Keep this before /{user_id} routes.
# ---------------------------------------------------------------------------


@router.delete(
    "/bulk",
    response_model=SuccessResponse[dict],
)
def bulk_delete_users(
    payload: BulkUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_DELETE")
    ),
):
    user_ids = normalize_user_ids(payload.user_ids)

    if current_user.id in user_ids:
        raise ConflictError(
            "You cannot delete your own account.",
            code="SELF_DELETE_FORBIDDEN",
        )

    users = get_bulk_users(
        db=db,
        user_ids=user_ids,
    )

    service = UserService(db)

    try:
        deleted_ids = service.bulk_delete(
            user_ids,
            commit=False,
        )

        for user_id in deleted_ids:
            AuditService(db).create(
                action="USER_DELETED",
                resource_type="USER",
                actor_user_id=current_user.id,
                resource_id=str(user_id),
                request_id=request.headers.get("X-Request-ID"),
                details={
                    "bulk_operation": True,
                },
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "success": True,
        "data": {
            "operation": "DELETE",
            "requested": len(user_ids),
            "deleted": len(deleted_ids),
            "deleted_user_ids": deleted_ids,
        },
    }


# ---------------------------------------------------------------------------
# Get
# ---------------------------------------------------------------------------


@router.get(
    "/{user_id}",
    response_model=SuccessResponse[UserResponse],
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission("USER_VIEW")
    ),
):
    user = UserService(db).get_user(user_id)

    return {
        "success": True,
        "data": serialize_user(user),
    }


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


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
        user_id=user_id,
        email=(
            str(payload.email)
            if payload.email is not None
            else None
        ),
        full_name=payload.full_name,
        role_id=payload.role_id,
    )

    AuditService(db).create(
        action="USER_UPDATED",
        resource_type="USER",
        actor_user_id=current_user.id,
        resource_id=str(user.id),
        request_id=request.headers.get("X-Request-ID"),
        details={
            "email": user.email,
            "full_name": user.full_name,
            "role_ids": sorted(
                role.id
                for role in user.roles
            ),
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
    }


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


@router.patch(
    "/{user_id}/status",
    response_model=SuccessResponse[UserResponse],
)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("USER_STATUS_UPDATE")
    ),
):
    if current_user.id == user_id and not payload.is_active:
        raise ConflictError(
            "You cannot deactivate your own account.",
            code="SELF_DEACTIVATION_FORBIDDEN",
        )

    user = UserService(db).set_active(
        user_id=user_id,
        is_active=payload.is_active,
    )

    action = (
        "USER_ACTIVATED"
        if payload.is_active
        else "USER_DEACTIVATED"
    )

    AuditService(db).create(
        action=action,
        resource_type="USER",
        actor_user_id=current_user.id,
        resource_id=str(user.id),
        request_id=request.headers.get("X-Request-ID"),
        details={
            "is_active": user.is_active,
            "sessions_revoked": not payload.is_active,
        },
    )

    return {
        "success": True,
        "data": serialize_user(user),
    }


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


@router.post(
    "/{user_id}/password",
    response_model=SuccessResponse[dict],
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
        user_id=user_id,
        password=payload.password,
    )

    AuditService(db).create(
        action="USER_PASSWORD_RESET",
        resource_type="USER",
        actor_user_id=current_user.id,
        resource_id=str(user.id),
        request_id=request.headers.get("X-Request-ID"),
        details={
            "sessions_revoked": True,
        },
    )

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "password_reset": True,
            "sessions_revoked": True,
        },
    }


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


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
            code="SELF_DELETE_FORBIDDEN",
        )

    UserService(db).delete_user(user_id)

    AuditService(db).create(
        action="USER_DELETED",
        resource_type="USER",
        actor_user_id=current_user.id,
        resource_id=str(user_id),
        request_id=request.headers.get("X-Request-ID"),
    )

    return {
        "success": True,
        "data": {
            "id": user_id,
            "deleted": True,
        },
    }