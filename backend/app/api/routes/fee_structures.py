from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.schemas.fee_structure import (
    FeeStructureCreate,
    FeeStructureResponse,
    FeeStructureStatusUpdate,
    FeeStructureUpdate,
)
from app.services.fee_structure import FeeStructureService

router = APIRouter(
    prefix="/fee-structures",
    tags=["Fee Structures"],
)


@router.post(
    "",
    response_model=FeeStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fee_structure(
    payload: FeeStructureCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_STRUCTURE_CREATE")
    ),
):
    fee_structure = FeeStructureService(db).create(
        **payload.model_dump()
    )

    return fee_structure


@router.get(
    "",
)
def list_fee_structures(
    school_id: int | None = Query(
        default=None,
        gt=0,
    ),
    academic_session_id: int | None = Query(
        default=None,
        gt=0,
    ),
    class_name: str | None = None,
    fee_head: str | None = None,
    frequency: str | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_STRUCTURE_VIEW")
    ),
):
    items, total = FeeStructureService(db).list(
        school_id=school_id,
        academic_session_id=academic_session_id,
        class_name=class_name,
        fee_head=fee_head,
        frequency=frequency,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
    )

    return {
        "success": True,
        "data": items,
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


@router.get(
    "/{fee_structure_id}",
    response_model=FeeStructureResponse,
)
def get_fee_structure(
    fee_structure_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_STRUCTURE_VIEW")
    ),
):
    return FeeStructureService(db).get(
        fee_structure_id
    )


@router.patch(
    "/{fee_structure_id}",
    response_model=FeeStructureResponse,
)
def update_fee_structure(
    fee_structure_id: int,
    payload: FeeStructureUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_STRUCTURE_UPDATE")
    ),
):
    changes = payload.model_dump(
        exclude_unset=True
    )

    return FeeStructureService(db).update(
        fee_structure_id,
        **changes,
    )


@router.patch(
    "/{fee_structure_id}/status",
    response_model=FeeStructureResponse,
)
def update_fee_structure_status(
    fee_structure_id: int,
    payload: FeeStructureStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("FEE_STRUCTURE_STATUS_UPDATE")
    ),
):
    return FeeStructureService(db).set_active(
        fee_structure_id,
        payload.is_active,
    )