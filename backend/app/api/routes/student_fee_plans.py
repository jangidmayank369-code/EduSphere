from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.schemas.student_fee_plan import (
    BulkStudentFeePlanCreate,
    BulkStudentFeePlanResult,
    StudentFeePlanCreate,
    StudentFeePlanListResponse,
    StudentFeePlanResponse,
    StudentFeePlanStatusUpdate,
    StudentFeePlanUpdate,
)
from app.services.student_fee_plan import StudentFeePlanService


router = APIRouter(
    prefix="/student-fee-plans",
    tags=["Student Fee Plans"],
)


def _serialize(plan, service):
    response = StudentFeePlanResponse.model_validate(plan)
    response.items = service.get_items(plan.id)
    response.installments = service.get_installments(plan.id)
    return response


@router.post(
    "",
    response_model=StudentFeePlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student_fee_plan(
    payload: StudentFeePlanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_CREATE")
    ),
):
    service = StudentFeePlanService(db)
    plan = service.create(payload)
    return _serialize(plan, service)


@router.post(
    "/bulk",
    response_model=BulkStudentFeePlanResult,
    status_code=status.HTTP_201_CREATED,
)
def bulk_create_student_fee_plans(
    payload: BulkStudentFeePlanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_BULK_CREATE")
    ),
):
    service = StudentFeePlanService(db)
    return service.bulk_create(payload)


@router.get(
    "",
    response_model=StudentFeePlanListResponse,
)
def list_student_fee_plans(
    school_id: int | None = Query(default=None),
    academic_session_id: int | None = Query(default=None),
    student_id: int | None = Query(default=None),
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_VIEW")
    ),
):
    service = StudentFeePlanService(db)

    plans, total = service.list(
        school_id=school_id,
        academic_session_id=academic_session_id,
        student_id=student_id,
        status=status_filter,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
    )

    return {
        "success": True,
        "data": [
            _serialize(plan, service)
            for plan in plans
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (
                (total + page_size - 1) // page_size
                if total
                else 0
            ),
        },
    }


@router.get(
    "/{plan_id}",
    response_model=StudentFeePlanResponse,
)
def get_student_fee_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_VIEW")
    ),
):
    service = StudentFeePlanService(db)
    return _serialize(service.get(plan_id), service)


@router.patch(
    "/{plan_id}",
    response_model=StudentFeePlanResponse,
)
def update_student_fee_plan(
    plan_id: int,
    payload: StudentFeePlanUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_UPDATE")
    ),
):
    service = StudentFeePlanService(db)
    return _serialize(
        service.update(plan_id, payload),
        service,
    )


@router.post(
    "/{plan_id}/recalculate",
    response_model=StudentFeePlanResponse,
)
def recalculate_student_fee_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_UPDATE")
    ),
):
    service = StudentFeePlanService(db)

    return _serialize(
        service.recalculate(plan_id),
        service,
    )


@router.patch(
    "/{plan_id}/status",
    response_model=StudentFeePlanResponse,
)
def update_student_fee_plan_status(
    plan_id: int,
    payload: StudentFeePlanStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission("STUDENT_FEE_PLAN_STATUS_UPDATE")
    ),
):
    service = StudentFeePlanService(db)

    return _serialize(
        service.set_active(
            plan_id,
            payload.is_active,
        ),
        service,
    )