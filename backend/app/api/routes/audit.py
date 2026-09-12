from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.services.audit import AuditService


router = APIRouter(
    prefix="/audit",
    tags=["Audit"],
)


@router.get(
    "",
    response_model=dict,
)
def list_audit_logs(
    page: int = 1,
    page_size: int = 20,
    action: str | None = None,
    resource_type: str | None = None,
    actor_user_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("AUDIT_READ")),
):
    logs, total = AuditService(db).list(
        page=page,
        page_size=page_size,
        action=action,
        resource_type=resource_type,
        actor_user_id=actor_user_id,
    )

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    return {
        "success": True,
        "data": [
            AuditLogResponse.model_validate(log).model_dump()
            for log in logs
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/{audit_id}",
    response_model=dict,
)
def get_audit_log(
    audit_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("AUDIT_READ")),
):
    audit_log = AuditService(db).get(audit_id)

    return {
        "success": True,
        "data": AuditLogResponse.model_validate(
            audit_log
        ).model_dump(),
    }