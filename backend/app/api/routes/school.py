from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_permission
from app.core.database import get_db
from app.core.exceptions import ConflictError
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.school import (
    AcademicSessionCreate,
    AcademicSessionResponse,
    AcademicSessionUpdate,
    SchoolCreate,
    SchoolResponse,
    SchoolUpdate,
)
from app.services.school import AcademicSessionService, SchoolService

router = APIRouter(prefix="/schools", tags=["School"])


@router.post(
    "",
    response_model=SuccessResponse[SchoolResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("SCHOOL_CREATE")),
):
    school = SchoolService(db).create(**payload.model_dump())

    return {
        "success": True,
        "data": school,
    }


@router.get("", response_model=dict)
def list_schools(
    page: int = 1,
    page_size: int = 20,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    schools, total = SchoolService(db).list(
        page=page,
        page_size=page_size,
        is_active=is_active,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "success": True,
        "data": [
            SchoolResponse.model_validate(school).model_dump()
            for school in schools
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ---------------------------------------------------------------------------
# Academic Session static routes MUST come before /{school_id}
# ---------------------------------------------------------------------------

@router.get(
    "/academic-sessions/{session_id}",
    response_model=SuccessResponse[AcademicSessionResponse],
)
def get_academic_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = AcademicSessionService(db).get(session_id)

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
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("ACADEMIC_SESSION_UPDATE")),
):
    session = AcademicSessionService(db).update(
        session_id,
        **payload.model_dump(exclude_unset=True),
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
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission("ACADEMIC_SESSION_SET_CURRENT")
    ),
):
    session = AcademicSessionService(db).set_current(session_id)

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
    is_active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("ACADEMIC_SESSION_UPDATE")),
):
    session = AcademicSessionService(db).set_active(
        session_id,
        is_active,
    )

    return {
        "success": True,
        "data": session,
    }


# ---------------------------------------------------------------------------
# School routes
# ---------------------------------------------------------------------------

@router.get(
    "/{school_id}",
    response_model=SuccessResponse[SchoolResponse],
)
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    school = SchoolService(db).get(school_id)

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
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("SCHOOL_UPDATE")),
):
    school = SchoolService(db).update(
        school_id,
        **payload.model_dump(exclude_unset=True),
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
    is_active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("SCHOOL_UPDATE")),
):
    school = SchoolService(db).set_active(
        school_id,
        is_active,
    )

    return {
        "success": True,
        "data": school,
    }


# ---------------------------------------------------------------------------
# School Academic Sessions
# ---------------------------------------------------------------------------

@router.post(
    "/{school_id}/academic-sessions",
    response_model=SuccessResponse[AcademicSessionResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_academic_session(
    school_id: int,
    payload: AcademicSessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("ACADEMIC_SESSION_CREATE")),
):
    if payload.school_id != school_id:
        raise ConflictError(
            "Payload school_id does not match URL school_id.",
            code="SCHOOL_ID_MISMATCH",
        )

    session = AcademicSessionService(db).create(
        school_id=school_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )

    return {
        "success": True,
        "data": session,
    }


@router.get(
    "/{school_id}/academic-sessions",
    response_model=dict,
)
def list_academic_sessions(
    school_id: int,
    page: int = 1,
    page_size: int = 20,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sessions, total = AcademicSessionService(db).list_for_school(
        school_id,
        page=page,
        page_size=page_size,
        is_active=is_active,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "success": True,
        "data": [
            AcademicSessionResponse.model_validate(session).model_dump()
            for session in sessions
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
    response_model=SuccessResponse[AcademicSessionResponse],
)
def get_current_academic_session(
    school_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = AcademicSessionService(db).get_current(school_id)

    return {
        "success": True,
        "data": session,
    }