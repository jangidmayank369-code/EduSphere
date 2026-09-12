from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.rbac import (
    AssignmentRequest,
    PermissionCreate,
    PermissionResponse,
    RoleCreate,
    RoleResponse,
    UserPermissionsResponse,
)
from app.services.rbac import RBACService


router = APIRouter(
    prefix="/rbac",
    tags=["RBAC"],
)


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

@router.post(
    "/roles",
    response_model=SuccessResponse[RoleResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_ROLE_CREATE")),
):
    role = RBACService(db).create_role(
        name=payload.name,
        description=payload.description,
    )

    return {
        "success": True,
        "data": role,
    }


@router.get(
    "/roles",
    response_model=SuccessResponse[list[RoleResponse]],
)
def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": RBACService(db).list_roles(),
    }


@router.get(
    "/roles/{role_id}",
    response_model=SuccessResponse[RoleResponse],
)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": RBACService(db).get_role(role_id),
    }


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

@router.post(
    "/permissions",
    response_model=SuccessResponse[PermissionResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_permission(
    payload: PermissionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_PERMISSION_CREATE")),
):
    permission = RBACService(db).create_permission(
        code=payload.code,
        description=payload.description,
    )

    return {
        "success": True,
        "data": permission,
    }


@router.get(
    "/permissions",
    response_model=SuccessResponse[list[PermissionResponse]],
)
def list_permissions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": RBACService(db).list_permissions(),
    }


@router.get(
    "/permissions/{permission_id}",
    response_model=SuccessResponse[PermissionResponse],
)
def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": RBACService(db).get_permission(permission_id),
    }


# ---------------------------------------------------------------------------
# User ↔ Role
# ---------------------------------------------------------------------------

@router.post(
    "/users/{user_id}/roles",
    response_model=SuccessResponse[dict],
)
def assign_role(
    user_id: int,
    payload: AssignmentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_ROLE_ASSIGN")),
):
    user = RBACService(db).assign_role(
        user_id=user_id,
        role_id=payload.id,
    )

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "role_ids": [role.id for role in user.roles],
        },
    }


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    response_model=SuccessResponse[dict],
)
def remove_role(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_ROLE_ASSIGN")),
):
    user = RBACService(db).remove_role(
        user_id=user_id,
        role_id=role_id,
    )

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "role_ids": [role.id for role in user.roles],
        },
    }


# ---------------------------------------------------------------------------
# Role ↔ Permission
# ---------------------------------------------------------------------------

@router.post(
    "/roles/{role_id}/permissions",
    response_model=SuccessResponse[dict],
)
def assign_permission(
    role_id: int,
    payload: AssignmentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_PERMISSION_ASSIGN")),
):
    role = RBACService(db).assign_permission(
        role_id=role_id,
        permission_id=payload.id,
    )

    return {
        "success": True,
        "data": {
            "role_id": role.id,
            "permission_ids": [
                permission.id
                for permission in role.permissions
            ],
        },
    }


@router.delete(
    "/roles/{role_id}/permissions/{permission_id}",
    response_model=SuccessResponse[dict],
)
def remove_permission(
    role_id: int,
    permission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("RBAC_PERMISSION_ASSIGN")),
):
    role = RBACService(db).remove_permission(
        role_id=role_id,
        permission_id=permission_id,
    )

    return {
        "success": True,
        "data": {
            "role_id": role.id,
            "permission_ids": [
                permission.id
                for permission in role.permissions
            ],
        },
    }


# ---------------------------------------------------------------------------
# User permissions
# ---------------------------------------------------------------------------

@router.get(
    "/users/{user_id}/permissions",
    response_model=SuccessResponse[UserPermissionsResponse],
)
def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    permissions = RBACService(db).get_user_permissions(user_id)

    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "permissions": permissions,
        },
    }