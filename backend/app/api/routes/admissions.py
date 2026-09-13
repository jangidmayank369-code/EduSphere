from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionResponse,
    AdmissionStatusUpdate,
    AdmissionUpdate,
)
from app.services.admission import AdmissionService


router = APIRouter(
    prefix="/admissions",
    tags=["Admissions"],
)


@router.post(
    "",
    response_model=AdmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admission(
    payload: AdmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ADMISSION_CREATE")
    ),
):
    service = AdmissionService(db)

    return service.create(
        school_id=payload.school_id,
        academic_session_id=(
            payload.academic_session_id
        ),
        payload=payload.model_dump(
            exclude={
                "school_id",
                "academic_session_id",
            }
        ),
    )


@router.get(
    "",
)
def list_admissions(
    school_id: int | None = Query(
        default=None,
        ge=1,
    ),
    academic_session_id: int | None = Query(
        default=None,
        ge=1,
    ),
    status: str | None = Query(
        default=None,
    ),
    class_applied: str | None = Query(
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
        require_permission("ADMISSION_VIEW")
    ),
):
    service = AdmissionService(db)

    items, total = service.list(
        school_id=school_id,
        academic_session_id=academic_session_id,
        status=status,
        class_applied=class_applied,
        search=search,
        page=page,
        page_size=page_size,
    )

    return {
        "success": True,
        "data": [
            AdmissionResponse.model_validate(
                item
            ).model_dump()
            for item in items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (
                (total + page_size - 1)
                // page_size
                if total
                else 0
            ),
        },
    }


@router.get(
    "/{admission_id}",
    response_model=AdmissionResponse,
)
def get_admission(
    admission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ADMISSION_VIEW")
    ),
):
    service = AdmissionService(db)

    return service.get(
        admission_id
    )


@router.patch(
    "/{admission_id}",
    response_model=AdmissionResponse,
)
def update_admission(
    admission_id: int,
    payload: AdmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ADMISSION_UPDATE")
    ),
):
    service = AdmissionService(db)

    return service.update(
        admission_id=admission_id,
        payload=payload.model_dump(
            exclude_unset=True
        ),
    )


@router.patch(
    "/{admission_id}/status",
    response_model=AdmissionResponse,
)
def update_admission_status(
    admission_id: int,
    payload: AdmissionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "ADMISSION_STATUS_UPDATE"
        )
    ),
):
    service = AdmissionService(db)

    return service.update_status(
        admission_id=admission_id,
        new_status=payload.status,
        rejection_reason=(
            payload.rejection_reason
        ),
    )