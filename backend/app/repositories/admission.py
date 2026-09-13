from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.admission import Admission


class AdmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        admission: Admission,
    ) -> Admission:
        self.db.add(admission)
        self.db.commit()
        self.db.refresh(admission)
        return admission

    def get_by_id(
        self,
        admission_id: int,
    ) -> Admission | None:
        return self.db.get(
            Admission,
            admission_id,
        )

    def get_by_application_number(
        self,
        application_number: str,
    ) -> Admission | None:
        query = select(Admission).where(
            Admission.application_number
            == application_number
        )

        return self.db.scalar(query)

    def get_by_admission_number(
        self,
        admission_number: str,
    ) -> Admission | None:
        query = select(Admission).where(
            Admission.admission_number
            == admission_number
        )

        return self.db.scalar(query)

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
    ) -> tuple[list[Admission], int]:
        query = select(Admission)
        count_query = select(
            func.count()
        ).select_from(Admission)

        filters = []

        if school_id is not None:
            filters.append(
                Admission.school_id == school_id
            )

        if academic_session_id is not None:
            filters.append(
                Admission.academic_session_id
                == academic_session_id
            )

        if status:
            filters.append(
                Admission.status == status.strip()
            )

        if class_applied:
            filters.append(
                Admission.class_applied
                == class_applied.strip()
            )

        if search:
            pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    Admission.application_number.ilike(
                        pattern
                    ),
                    Admission.admission_number.ilike(
                        pattern
                    ),
                    Admission.first_name.ilike(
                        pattern
                    ),
                    Admission.middle_name.ilike(
                        pattern
                    ),
                    Admission.last_name.ilike(
                        pattern
                    ),
                    Admission.parent_name.ilike(
                        pattern
                    ),
                    Admission.parent_phone.ilike(
                        pattern
                    ),
                    Admission.parent_email.ilike(
                        pattern
                    ),
                )
            )

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        total = self.db.scalar(
            count_query
        ) or 0

        query = (
            query.order_by(
                Admission.created_at.desc(),
                Admission.id.desc(),
            )
            .offset(
                (page - 1) * page_size
            )
            .limit(page_size)
        )

        items = list(
            self.db.scalars(query).all()
        )

        return items, total

    def save(
        self,
        admission: Admission,
    ) -> Admission:
        self.db.add(admission)
        self.db.commit()
        self.db.refresh(admission)
        return admission