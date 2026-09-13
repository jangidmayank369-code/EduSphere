from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
)
from app.models.admission import Admission
from app.models.school import (
    AcademicSession,
    School,
)
from app.repositories.admission import (
    AdmissionRepository,
)


class AdmissionService:
    VALID_STATUSES = {
        "enquiry",
        "application",
        "documents",
        "verification",
        "assessment",
        "approved",
        "rejected",
        "hold",
        "confirmed",
    }

    STATUS_TRANSITIONS = {
        "enquiry": {
            "application",
            "hold",
            "rejected",
        },
        "application": {
            "documents",
            "hold",
            "rejected",
        },
        "documents": {
            "verification",
            "hold",
            "rejected",
        },
        "verification": {
            "assessment",
            "approved",
            "hold",
            "rejected",
        },
        "assessment": {
            "approved",
            "hold",
            "rejected",
        },
        "approved": {
            "confirmed",
            "hold",
            "rejected",
        },
        "hold": {
            "enquiry",
            "application",
            "documents",
            "verification",
            "assessment",
            "approved",
            "rejected",
        },
        "rejected": {
            "enquiry",
        },
        "confirmed": set(),
    }

    def __init__(self, db: Session):
        self.db = db
        self.repository = AdmissionRepository(db)

    def _validate_school_and_session(
        self,
        school_id: int,
        academic_session_id: int,
    ) -> AcademicSession:
        school = self.db.get(
            School,
            school_id,
        )

        if not school:
            raise NotFoundError(
                "School not found.",
                code="SCHOOL_NOT_FOUND",
            )

        session = self.db.get(
            AcademicSession,
            academic_session_id,
        )

        if not session:
            raise NotFoundError(
                "Academic session not found.",
                code="ACADEMIC_SESSION_NOT_FOUND",
            )

        if session.school_id != school_id:
            raise ConflictError(
                "Academic session does not belong to the selected school.",
                code="SESSION_SCHOOL_MISMATCH",
            )

        if not session.is_active:
            raise ConflictError(
                "Academic session is inactive.",
                code="SESSION_INACTIVE",
            )

        return session

    def _generate_application_number(
        self,
        school_id: int,
        academic_session_id: int,
    ) -> str:
        session = self.db.get(
            AcademicSession,
            academic_session_id,
        )

        if not session:
            raise NotFoundError(
                "Academic session not found.",
                code="ACADEMIC_SESSION_NOT_FOUND",
            )

        year = session.start_date.year

        prefix = f"ADM-{year}-"

        query = (
            self.repository.db.query(Admission)
            .filter(
                Admission.school_id == school_id,
                Admission.academic_session_id
                == academic_session_id,
                Admission.application_number.like(
                    f"{prefix}%"
                ),
            )
            .order_by(
                Admission.id.desc()
            )
        )

        latest = query.first()

        if latest:
            try:
                last_number = int(
                    latest.application_number.split(
                        "-"
                    )[-1]
                )
            except (ValueError, IndexError):
                last_number = 0
        else:
            last_number = 0

        return (
            f"{prefix}{last_number + 1:05d}"
        )

    def create(
        self,
        school_id: int,
        academic_session_id: int,
        payload: dict,
    ) -> Admission:
        self._validate_school_and_session(
            school_id=school_id,
            academic_session_id=academic_session_id,
        )

        application_number = (
            self._generate_application_number(
                school_id=school_id,
                academic_session_id=academic_session_id,
            )
        )

        admission = Admission(
            school_id=school_id,
            academic_session_id=academic_session_id,
            application_number=application_number,
            status="enquiry",
            **payload,
        )

        return self.repository.create(
            admission
        )

    def get(
        self,
        admission_id: int,
    ) -> Admission:
        admission = self.repository.get_by_id(
            admission_id
        )

        if not admission:
            raise NotFoundError(
                "Admission application not found.",
                code="ADMISSION_NOT_FOUND",
            )

        return admission

    def list(
        self,
        *,
        school_id: int | None = None,
        academic_session_id: int | None = None,
        status: str | None = None,
        class_applied: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ):
        return self.repository.list(
            school_id=school_id,
            academic_session_id=academic_session_id,
            status=status,
            class_applied=class_applied,
            search=search,
            page=page,
            page_size=page_size,
        )

    def update(
        self,
        admission_id: int,
        payload: dict,
    ) -> Admission:
        admission = self.get(
            admission_id
        )

        if admission.status == "confirmed":
            raise ConflictError(
                "Confirmed admission cannot be edited.",
                code="ADMISSION_ALREADY_CONFIRMED",
            )

        if "academic_session_id" in payload:
            session_id = payload[
                "academic_session_id"
            ]

            self._validate_school_and_session(
                school_id=admission.school_id,
                academic_session_id=session_id,
            )

        for field, value in payload.items():
            setattr(
                admission,
                field,
                value,
            )

        return self.repository.save(
            admission
        )

    def update_status(
        self,
        admission_id: int,
        new_status: str,
        rejection_reason: str | None = None,
    ) -> Admission:
        admission = self.get(
            admission_id
        )

        new_status = new_status.strip().lower()

        if new_status not in self.VALID_STATUSES:
            raise ConflictError(
                "Invalid admission status.",
                code="INVALID_ADMISSION_STATUS",
            )

        if new_status == admission.status:
            if (
                new_status == "rejected"
                and rejection_reason
            ):
                admission.rejection_reason = (
                    rejection_reason
                )
                return self.repository.save(
                    admission
                )

            return admission

        allowed = self.STATUS_TRANSITIONS.get(
            admission.status,
            set(),
        )

        if new_status not in allowed:
            raise ConflictError(
                (
                    f"Invalid admission status transition "
                    f"from '{admission.status}' "
                    f"to '{new_status}'."
                ),
                code="INVALID_STATUS_TRANSITION",
            )

        if (
            new_status == "rejected"
            and not rejection_reason
        ):
            raise ConflictError(
                "Rejection reason is required.",
                code="REJECTION_REASON_REQUIRED",
            )

        admission.status = new_status

        if new_status == "rejected":
            admission.rejection_reason = (
                rejection_reason
            )
        else:
            admission.rejection_reason = None

        return self.repository.save(
            admission
        )