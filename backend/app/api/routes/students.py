from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.bulk import BulkStudentStatusUpdate
from app.schemas.student import (
    StudentCreate,
    StudentParentLinkCreate,
    StudentResponse,
    StudentStatusUpdate,
    StudentUpdate,
)
from app.services.student import StudentService


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/students",
    tags=["Students"],
)

UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads"
STUDENT_PHOTO_DIR = UPLOAD_ROOT / "students"

MAX_PHOTO_SIZE = 5 * 1024 * 1024

ALLOWED_PHOTO_TYPES = {
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/webp": (".webp", None),
}


def _is_valid_image(content_type: str, data: bytes) -> bool:
    if content_type == "image/webp":
        return (
            len(data) >= 12
            and data[:4] == b"RIFF"
            and data[8:12] == b"WEBP"
        )

    signature = ALLOWED_PHOTO_TYPES[content_type][1]
    return signature is not None and data.startswith(signature)


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_CREATE")
    ),
):
    service = StudentService(db)

    return service.create(
        school_id=payload.school_id,
        academic_session_id=payload.academic_session_id,
        payload=payload.model_dump(
            exclude={
                "school_id",
                "academic_session_id",
            }
        ),
    )


# ---------------------------------------------------------------------------
# LIST / SEARCH / FILTER / PAGINATION
# ---------------------------------------------------------------------------

@router.get("")
def list_students(
    school_id: int | None = Query(default=None, ge=1),
    academic_session_id: int | None = Query(default=None, ge=1),
    status: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_VIEW")
    ),
):
    service = StudentService(db)

    items, total = service.list(
        school_id=school_id,
        academic_session_id=academic_session_id,
        status=status,
        is_active=is_active,
        search=search,
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
        "data": [
            StudentResponse.model_validate(student).model_dump()
            for student in items
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ---------------------------------------------------------------------------
# BULK STATUS
# ---------------------------------------------------------------------------

@router.post("/bulk-status")
def bulk_update_student_status(
    payload: BulkStudentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_BULK_STATUS_UPDATE")
    ),
):
    service = StudentService(db)

    students = service.bulk_set_active(
        student_ids=payload.student_ids,
        is_active=payload.is_active,
    )

    return {
        "success": True,
        "message": "Student statuses updated successfully.",
        "data": [
            StudentResponse.model_validate(student).model_dump()
            for student in students
        ],
        "meta": {
            "requested": len(set(payload.student_ids)),
            "updated": len(students),
            "is_active": payload.is_active,
        },
    }


# ---------------------------------------------------------------------------
# STUDENT PHOTO UPLOAD
# ---------------------------------------------------------------------------

@router.post("/{student_id}/photo")
async def upload_student_photo(
    student_id: int,
    request: Request,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_UPDATE")
    ),
):
    content_type = (photo.content_type or "").lower().strip()

    if content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPG, PNG and WebP images are allowed.",
        )

    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    STUDENT_PHOTO_DIR.mkdir(parents=True, exist_ok=True)

    extension = ALLOWED_PHOTO_TYPES[content_type][0]
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = STUDENT_PHOTO_DIR / filename

    size = 0
    header = bytearray()

    try:
        with destination.open("wb") as output:
            while True:
                chunk = await photo.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_PHOTO_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="Photo must not exceed 5 MB.",
                    )

                if len(header) < 12:
                    header.extend(chunk[: 12 - len(header)])

                output.write(chunk)

        if not _is_valid_image(content_type, bytes(header)):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="The uploaded file is not a valid supported image.",
            )

        photo_url = (
            f"{str(request.base_url).rstrip('/')}"
            f"/uploads/students/{filename}"
        )

        student.photo_url = photo_url
        db.commit()
        db.refresh(student)

        return {
            "success": True,
            "message": "Student photo uploaded successfully.",
            "data": {
                "student_id": student.id,
                "photo_url": student.photo_url,
            },
        }

    except Exception:
        if destination.exists():
            destination.unlink(missing_ok=True)

        db.rollback()
        raise

    finally:
        await photo.close()


# ---------------------------------------------------------------------------
# DETAIL
# ---------------------------------------------------------------------------

@router.get(
    "/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_VIEW")
    ),
):
    service = StudentService(db)
    return service.get(student_id)


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_UPDATE")
    ),
):
    service = StudentService(db)

    return service.update(
        student_id=student_id,
        payload=payload.model_dump(exclude_unset=True),
    )


# ---------------------------------------------------------------------------
# ACTIVATE / DEACTIVATE
# ---------------------------------------------------------------------------

@router.patch(
    "/{student_id}/status",
    response_model=StudentResponse,
)
def update_student_status(
    student_id: int,
    payload: StudentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_STATUS_UPDATE")
    ),
):
    service = StudentService(db)

    return service.set_active(
        student_id=student_id,
        is_active=payload.is_active,
    )


# ---------------------------------------------------------------------------
# LINK PARENT
# ---------------------------------------------------------------------------

@router.post("/{student_id}/parents")
def link_parent_to_student(
    student_id: int,
    payload: StudentParentLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_PARENT_LINK")
    ),
):
    service = StudentService(db)

    link = service.link_parent(
        student_id=student_id,
        parent_id=payload.parent_id,
        relationship_type=payload.relationship_type,
        is_primary=payload.is_primary,
        is_emergency_contact=payload.is_emergency_contact,
    )

    return {
        "success": True,
        "data": {
            "id": link.id,
            "student_id": link.student_id,
            "parent_id": link.parent_id,
            "relationship_type": link.relationship_type,
            "is_primary": link.is_primary,
            "is_emergency_contact": link.is_emergency_contact,
        },
    }


# ---------------------------------------------------------------------------
# LIST PARENTS
# ---------------------------------------------------------------------------

@router.get("/{student_id}/parents")
def list_student_parents(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_VIEW")
    ),
):
    service = StudentService(db)
    links = service.list_parents(student_id)

    return {
        "success": True,
        "data": [
            {
                "id": link.id,
                "student_id": link.student_id,
                "parent_id": link.parent_id,
                "relationship_type": link.relationship_type,
                "is_primary": link.is_primary,
                "is_emergency_contact": link.is_emergency_contact,
            }
            for link in links
        ],
    }


# ---------------------------------------------------------------------------
# UNLINK PARENT
# ---------------------------------------------------------------------------

@router.delete("/{student_id}/parents/{parent_id}")
def unlink_parent_from_student(
    student_id: int,
    parent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("STUDENT_PARENT_LINK")
    ),
):
    service = StudentService(db)

    service.unlink_parent(
        student_id=student_id,
        parent_id=parent_id,
    )

    return {
        "success": True,
        "message": "Parent unlinked successfully.",
    }