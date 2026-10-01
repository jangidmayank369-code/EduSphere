from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.rbac import (
    AssignmentRequest,
    PermissionCreate,
    PermissionResponse,
    PermissionUpdate,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    UserPermissionsResponse,
)
from app.services.audit import AuditService
from app.services.rbac import RBACService


router = APIRouter(
    prefix="/rbac",
    tags=["RBAC"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _audit(
    db: Session,
    *,
    request: Request,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict | None = None,
) -> None:
    AuditService(db).create(
        action=action,
        resource_type=resource_type,
        actor_user_id=actor.id,
        resource_id=resource_id,
        request_id=request.headers.get("X-Request-ID"),
        details=details,
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_CREATE")
    ),
):
    role = RBACService(db).create_role(
        name=payload.name,
        description=payload.description,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_ROLE_CREATED",
        resource_type="ROLE",
        resource_id=str(role.id),
        details={
            "name": role.name,
        },
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
    _: User = Depends(
        require_permission("RBAC_ROLE_VIEW")
    ),
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
    _: User = Depends(
        require_permission("RBAC_ROLE_VIEW")
    ),
):
    return {
        "success": True,
        "data": RBACService(db).get_role(role_id),
    }


@router.patch(
    "/roles/{role_id}",
    response_model=SuccessResponse[RoleResponse],
)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_UPDATE")
    ),
):
    role = RBACService(db).update_role(
        role_id=role_id,
        name=payload.name,
        description=payload.description,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_ROLE_UPDATED",
        resource_type="ROLE",
        resource_id=str(role.id),
        details={
            "name": role.name,
        },
    )

    return {
        "success": True,
        "data": role,
    }


@router.delete(
    "/roles/{role_id}",
    response_model=SuccessResponse[dict],
)
def delete_role(
    role_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_DELETE")
    ),
):
    RBACService(db).delete_role(role_id)

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_ROLE_DELETED",
        resource_type="ROLE",
        resource_id=str(role_id),
    )

    return {
        "success": True,
        "data": {
            "id": role_id,
            "deleted": True,
        },
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_PERMISSION_CREATE")
    ),
):
    permission = RBACService(db).create_permission(
        code=payload.code,
        description=payload.description,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_PERMISSION_CREATED",
        resource_type="PERMISSION",
        resource_id=str(permission.id),
        details={
            "code": permission.code,
        },
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
    _: User = Depends(
        require_permission("RBAC_PERMISSION_VIEW")
    ),
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
    _: User = Depends(
        require_permission("RBAC_PERMISSION_VIEW")
    ),
):
    return {
        "success": True,
        "data": RBACService(db).get_permission(
            permission_id
        ),
    }


@router.patch(
    "/permissions/{permission_id}",
    response_model=SuccessResponse[PermissionResponse],
)
def update_permission(
    permission_id: int,
    payload: PermissionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_PERMISSION_UPDATE")
    ),
):
    permission = RBACService(db).update_permission(
        permission_id=permission_id,
        code=payload.code,
        description=payload.description,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_PERMISSION_UPDATED",
        resource_type="PERMISSION",
        resource_id=str(permission.id),
        details={
            "code": permission.code,
        },
    )

    return {
        "success": True,
        "data": permission,
    }


@router.delete(
    "/permissions/{permission_id}",
    response_model=SuccessResponse[dict],
)
def delete_permission(
    permission_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_PERMISSION_DELETE")
    ),
):
    RBACService(db).delete_permission(permission_id)

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_PERMISSION_DELETED",
        resource_type="PERMISSION",
        resource_id=str(permission_id),
    )

    return {
        "success": True,
        "data": {
            "id": permission_id,
            "deleted": True,
        },
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_ASSIGN")
    ),
):
    user = RBACService(db).assign_role(
        user_id=user_id,
        role_id=payload.id,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_ROLE_ASSIGNED",
        resource_type="USER",
        resource_id=str(user.id),
        details={
            "role_id": payload.id,
        },
    )

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "role_ids": sorted(
                role.id for role in user.roles
            ),
        },
    }


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    response_model=SuccessResponse[dict],
)
def remove_role(
    user_id: int,
    role_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_ROLE_ASSIGN")
    ),
):
    user = RBACService(db).remove_role(
        user_id=user_id,
        role_id=role_id,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_ROLE_REMOVED",
        resource_type="USER",
        resource_id=str(user.id),
        details={
            "role_id": role_id,
        },
    )

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "role_ids": sorted(
                role.id for role in user.roles
            ),
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_PERMISSION_ASSIGN")
    ),
):
    role = RBACService(db).assign_permission(
        role_id=role_id,
        permission_id=payload.id,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_PERMISSION_ASSIGNED",
        resource_type="ROLE",
        resource_id=str(role.id),
        details={
            "permission_id": payload.id,
        },
    )

    return {
        "success": True,
        "data": {
            "role_id": role.id,
            "permission_ids": sorted(
                permission.id
                for permission in role.permissions
            ),
        },
    }


@router.delete(
    "/roles/{role_id}/permissions/{permission_id}",
    response_model=SuccessResponse[dict],
)
def remove_permission(
    role_id: int,
    permission_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("RBAC_PERMISSION_ASSIGN")
    ),
):
    role = RBACService(db).remove_permission(
        role_id=role_id,
        permission_id=permission_id,
    )

    _audit(
        db,
        request=request,
        actor=current_user,
        action="RBAC_PERMISSION_REMOVED",
        resource_type="ROLE",
        resource_id=str(role.id),
        details={
            "permission_id": permission_id,
        },
    )

    return {
        "success": True,
        "data": {
            "role_id": role.id,
            "permission_ids": sorted(
                permission.id
                for permission in role.permissions
            ),
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
    _: User = Depends(
        require_permission("USER_VIEW")
    ),
):
    permissions = RBACService(db).get_user_permissions(
        user_id
    )

    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "permissions": permissions,
        },
    }