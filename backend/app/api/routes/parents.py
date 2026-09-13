from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.bulk import BulkParentStatusUpdate
from app.schemas.parent import (
    ParentCreate,
    ParentResponse,
    ParentStatusUpdate,
    ParentUpdate,
)
from app.services.parent import ParentService

router = APIRouter(
    prefix="/parents",
    tags=["Parents"],
)


@router.post(
    "",
    response_model=ParentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_parent(
    payload: ParentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("PARENT_CREATE")
    ),
):
    service = ParentService(db)

    return service.create(
        school_id=payload.school_id,
        payload=payload.model_dump(
            exclude={"school_id"}
        ),
    )


@router.get(
    "",
)
def list_parents(
    school_id: int | None = Query(
        default=None,
        ge=1,
    ),
    is_active: bool | None = Query(
        default=None,
    ),
    search: str | None = Query(
        default=None,
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("PARENT_CREATE")
    ),
):
    service = ParentService(db)

    items, total = service.list(
        school_id=school_id,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
    )

    return {
        "success": True,
        "data": [
            ParentResponse.model_validate(
                parent
            ).model_dump()
            for parent in items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (
                (total + page_size - 1) // page_size
                if total
                else 0
            ),
        },
    }


@router.post(
    "/bulk-status",
)
def bulk_update_parent_status(
    payload: BulkParentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "PARENT_BULK_STATUS_UPDATE"
        )
    ),
):
    service = ParentService(db)

    parents = service.bulk_set_active(
        parent_ids=payload.parent_ids,
        is_active=payload.is_active,
    )

    return {
        "success": True,
        "message": (
            "Parent statuses updated successfully."
        ),
        "data": [
            ParentResponse.model_validate(
                parent
            ).model_dump()
            for parent in parents
        ],
        "meta": {
            "requested": len(
                set(payload.parent_ids)
            ),
            "updated": len(parents),
            "is_active": payload.is_active,
        },
    }


@router.get(
    "/{parent_id}/students",
)
def list_parent_students(
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("PARENT_CREATE")
    ),
):
    service = ParentService(db)

    links = service.list_students(parent_id)

    return {
        "success": True,
        "data": [
            {
                "id": link.id,
                "student_id": link.student_id,
                "parent_id": link.parent_id,
                "relationship_type": (
                    link.relationship_type
                ),
                "is_primary": link.is_primary,
                "is_emergency_contact": (
                    link.is_emergency_contact
                ),
            }
            for link in links
        ],
    }


@router.get(
    "/{parent_id}",
    response_model=ParentResponse,
)
def get_parent(
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("PARENT_CREATE")
    ),
):
    service = ParentService(db)

    return service.get(parent_id)


@router.patch(
    "/{parent_id}",
    response_model=ParentResponse,
)
def update_parent(
    parent_id: int,
    payload: ParentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("PARENT_UPDATE")
    ),
):
    service = ParentService(db)

    return service.update(
        parent_id=parent_id,
        payload=payload.model_dump(
            exclude_unset=True
        ),
    )


@router.patch(
    "/{parent_id}/status",
    response_model=ParentResponse,
)
def update_parent_status(
    parent_id: int,
    payload: ParentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "PARENT_STATUS_UPDATE"
        )
    ),
):
    service = ParentService(db)

    return service.set_active(
        parent_id=parent_id,
        is_active=payload.is_active,
    )