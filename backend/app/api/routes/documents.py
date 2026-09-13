from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_permission
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.document import (
    DocumentArchiveUpdate,
    DocumentCreate,
    DocumentResponse,
    DocumentStatusUpdate,
    DocumentUpdate,
)
from app.services.document import DocumentService


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


@router.post(
    "",
    response_model=SuccessResponse[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission("DOCUMENT_CREATE")
    ),
):
    document = DocumentService(db).create(
        payload.model_dump()
    )

    return {
        "success": True,
        "data": document,
    }


@router.get(
    "",
    response_model=SuccessResponse[list[DocumentResponse]],
)
def list_documents(
    school_id: int | None = Query(
        default=None,
        gt=0,
    ),
    student_id: int | None = Query(
        default=None,
        gt=0,
    ),
    parent_id: int | None = Query(
        default=None,
        gt=0,
    ),
    document_type: str | None = None,
    verification_status: str | None = None,
    is_active: bool | None = None,
    is_archived: bool | None = None,
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
    _: User = Depends(get_current_user),
):
    documents, total = DocumentService(db).list(
        school_id=school_id,
        student_id=student_id,
        parent_id=parent_id,
        document_type=document_type,
        verification_status=verification_status,
        is_active=is_active,
        is_archived=is_archived,
        page=page,
        page_size=page_size,
    )

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    return {
        "success": True,
        "data": documents,
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/{document_id}",
    response_model=SuccessResponse[DocumentResponse],
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": DocumentService(db).get(
            document_id
        ),
    }


@router.patch(
    "/{document_id}",
    response_model=SuccessResponse[DocumentResponse],
)
def update_document(
    document_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission("DOCUMENT_UPDATE")
    ),
):
    document = DocumentService(db).update(
        document_id=document_id,
        payload=payload.model_dump(
            exclude_unset=True
        ),
    )

    return {
        "success": True,
        "data": document,
    }


@router.patch(
    "/{document_id}/status",
    response_model=SuccessResponse[DocumentResponse],
)
def update_document_status(
    document_id: int,
    payload: DocumentStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission(
            "DOCUMENT_STATUS_UPDATE"
        )
    ),
):
    document = DocumentService(db).set_active(
        document_id=document_id,
        is_active=payload.is_active,
    )

    return {
        "success": True,
        "data": document,
    }


@router.patch(
    "/{document_id}/archive",
    response_model=SuccessResponse[DocumentResponse],
)
def update_document_archive(
    document_id: int,
    payload: DocumentArchiveUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(
        require_permission(
            "DOCUMENT_ARCHIVE"
        )
    ),
):
    document = DocumentService(db).set_archived(
        document_id=document_id,
        is_archived=payload.is_archived,
    )

    return {
        "success": True,
        "data": document,
    }