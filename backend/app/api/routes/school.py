from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.school import (
    AcademicSessionArchiveUpdate,
    AcademicSessionCloneRequest,
    AcademicSessionCreate,
    AcademicSessionResponse,
    AcademicSessionStatusUpdate,
    AcademicSessionUpdate,
    SchoolCreate,
    SchoolResponse,
    SchoolStatusUpdate,
    SchoolUpdate,
)
from app.services.audit import AuditService
from app.services.school import AcademicSessionService, SchoolService


router = APIRouter(
    prefix="/schools",
    tags=["Schools"],
)


def _audit(
    *,
    db: Session,
    request: Request,
    current_user: User,
    action: str,
    resource_type: str,
    resource_id: int | str | None = None,
    details: dict | None = None,
) -> None:
    AuditService(db).create(
        actor_user_id=current_user.id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        request_id=getattr(request.state, "request_id", None),
        details=details,
    )


# ---------------------------------------------------------------------------
# SCHOOL
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=SuccessResponse[SchoolResponse],
)
def create_school(
    payload: SchoolCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("SCHOOL_CREATE")),
):
    service = SchoolService(db)

    school = service.create(**payload.model_dump())

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="SCHOOL_CREATED",
        resource_type="SCHOOL",
        resource_id=school.id,
        details={
            "name": school.name,
        },
    )

    return {
        "success": True,
        "data": school,
    }


@router.get(
    "",
    response_model=PaginatedResponse[SchoolResponse],
)
def list_schools(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("SCHOOL_VIEW")),
):
    service = SchoolService(db)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    items, total = service.list(
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "success": True,
        "data": [
            SchoolResponse.model_validate(item)
            for item in items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ---------------------------------------------------------------------------
# ACADEMIC SESSION - SPECIFIC ROUTES
#
# These routes intentionally appear before /{school_id} so that
# /academic-sessions/... is never interpreted as a school_id.
# ---------------------------------------------------------------------------


@router.get(
    "/academic-sessions/{session_id}",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def get_academic_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_VIEW")
    ),
):
    service = AcademicSessionService(db)

    session = service.get(session_id)

    return {
        "success": True,
        "data": session,
    }


@router.patch(
    "/academic-sessions/{session_id}",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def update_academic_session(
    session_id: int,
    payload: AcademicSessionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_UPDATE")
    ),
):
    service = AcademicSessionService(db)

    session = service.update(
        session_id,
        **payload.model_dump(exclude_unset=True),
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_UPDATED",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": session.school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.patch(
    "/academic-sessions/{session_id}/status",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def update_academic_session_status(
    session_id: int,
    payload: AcademicSessionStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_STATUS_UPDATE")
    ),
):
    service = AcademicSessionService(db)

    session = service.set_active(
        session_id,
        payload.is_active,
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action=(
            "ACADEMIC_SESSION_ACTIVATED"
            if payload.is_active
            else "ACADEMIC_SESSION_DEACTIVATED"
        ),
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": session.school_id,
            "is_active": session.is_active,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.post(
    "/academic-sessions/{session_id}/set-current",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def set_current_academic_session(
    session_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_SET_CURRENT")
    ),
):
    service = AcademicSessionService(db)

    session = service.set_current(session_id)

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_SET_CURRENT",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": session.school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.post(
    "/academic-sessions/{session_id}/close",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def close_academic_session(
    session_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_CLOSE")
    ),
):
    service = AcademicSessionService(db)

    session = service.close(session_id)

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_CLOSED",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": session.school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.post(
    "/academic-sessions/{session_id}/archive",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def archive_academic_session(
    session_id: int,
    request: Request,
    payload: AcademicSessionArchiveUpdate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_ARCHIVE")
    ),
):
    service = AcademicSessionService(db)

    archive_payload = payload or AcademicSessionArchiveUpdate(
        is_archived=True
    )

    if not archive_payload.is_archived:
        raise ValueError(
            "Unarchiving an academic session is not supported by the current service contract."
        )

    session = service.archive(session_id)

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action=(
            "ACADEMIC_SESSION_ARCHIVED"
            if archive_payload.is_archived
            else "ACADEMIC_SESSION_UNARCHIVED"
        ),
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": session.school_id,
            "is_archived": session.is_archived,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.post(
    "/academic-sessions/{session_id}/clone",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def clone_academic_session(
    session_id: int,
    payload: AcademicSessionCloneRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_CLONE")
    ),
):
    service = AcademicSessionService(db)

    session = service.clone(
        session_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        carry_forward=payload.carry_forward,
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_CLONED",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "source_session_id": session_id,
            "new_session_id": session.id,
            "school_id": session.school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.post(
    "/academic-sessions/{session_id}/carry-forward",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def carry_forward_academic_session(
    session_id: int,
    payload: AcademicSessionCloneRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_CARRY_FORWARD")
    ),
):
    service = AcademicSessionService(db)

    session = service.carry_forward(
        session_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_CARRY_FORWARD",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "source_session_id": session_id,
            "new_session_id": session.id,
            "school_id": session.school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


# ---------------------------------------------------------------------------
# SCHOOL DETAIL
# ---------------------------------------------------------------------------


@router.get(
    "/{school_id}",
    response_model=SuccessResponse[SchoolResponse],
)
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("SCHOOL_VIEW")),
):
    service = SchoolService(db)

    school = service.get(school_id)

    return {
        "success": True,
        "data": school,
    }


@router.patch(
    "/{school_id}",
    response_model=SuccessResponse[SchoolResponse],
)
def update_school(
    school_id: int,
    payload: SchoolUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("SCHOOL_UPDATE")),
):
    service = SchoolService(db)

    school = service.update(
        school_id,
        **payload.model_dump(exclude_unset=True),
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="SCHOOL_UPDATED",
        resource_type="SCHOOL",
        resource_id=school.id,
        details={
            "name": school.name,
        },
    )

    return {
        "success": True,
        "data": school,
    }


@router.patch(
    "/{school_id}/status",
    response_model=SuccessResponse[SchoolResponse],
)
def update_school_status(
    school_id: int,
    payload: SchoolStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("SCHOOL_STATUS_UPDATE")
    ),
):
    service = SchoolService(db)

    school = service.set_active(
        school_id,
        payload.is_active,
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action=(
            "SCHOOL_ACTIVATED"
            if payload.is_active
            else "SCHOOL_DEACTIVATED"
        ),
        resource_type="SCHOOL",
        resource_id=school.id,
        details={
            "name": school.name,
            "is_active": school.is_active,
        },
    )

    return {
        "success": True,
        "data": school,
    }


# ---------------------------------------------------------------------------
# ACADEMIC SESSION - SCHOOL SCOPED
# ---------------------------------------------------------------------------


@router.post(
    "/{school_id}/academic-sessions",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def create_academic_session(
    school_id: int,
    payload: AcademicSessionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_CREATE")
    ),
):
    service = AcademicSessionService(db)

    session = service.create(
        school_id=school_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    _audit(
        db=db,
        request=request,
        current_user=current_user,
        action="ACADEMIC_SESSION_CREATED",
        resource_type="ACADEMIC_SESSION",
        resource_id=session.id,
        details={
            "school_id": school_id,
            "name": session.name,
        },
    )

    return {
        "success": True,
        "data": session,
    }


@router.get(
    "/{school_id}/academic-sessions",
    response_model=PaginatedResponse[AcademicSessionResponse],
)
def list_academic_sessions(
    school_id: int,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    is_closed: bool | None = None,
    is_archived: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_VIEW")
    ),
):
    service = AcademicSessionService(db)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    items, total = service.list_for_school(
        school_id,
        page=page,
        page_size=page_size,
        is_active=is_active,
        is_archived=is_archived,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "success": True,
        "data": [
            AcademicSessionResponse.model_validate(item)
            for item in items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/{school_id}/academic-sessions/current",
    response_model=SuccessResponse[AcademicSessionResponse | None],
)
def get_current_academic_session(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("ACADEMIC_SESSION_VIEW")
    ),
):
    service = AcademicSessionService(db)

    session = service.current(school_id)

    return {
        "success": True,
        "data": session,
    }