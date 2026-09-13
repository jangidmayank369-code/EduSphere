from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.parent import StudentParent
from app.models.student import Student


class StudentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, student: Student) -> Student:
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def get_by_id(
        self,
        student_id: int,
    ) -> Student | None:
        return self.db.get(Student, student_id)

    def get_by_admission_number(
        self,
        school_id: int,
        admission_number: str,
    ) -> Student | None:
        query = select(Student).where(
            Student.school_id == school_id,
            Student.admission_number == admission_number,
        )

        return self.db.scalar(query)

    def list(
        self,
        *,
        school_id: int | None = None,
        academic_session_id: int | None = None,
        status: str | None = None,
        is_active: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Student], int]:
        query = select(Student)
        count_query = select(func.count()).select_from(Student)

        filters = []

        if school_id is not None:
            filters.append(
                Student.school_id == school_id
            )

        if academic_session_id is not None:
            filters.append(
                Student.academic_session_id
                == academic_session_id
            )

        if status:
            filters.append(
                Student.status == status.strip()
            )

        if is_active is not None:
            filters.append(
                Student.is_active == is_active
            )

        if search:
            pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    Student.admission_number.ilike(pattern),
                    Student.roll_number.ilike(pattern),
                    Student.first_name.ilike(pattern),
                    Student.middle_name.ilike(pattern),
                    Student.last_name.ilike(pattern),
                    Student.phone.ilike(pattern),
                    Student.email.ilike(pattern),
                )
            )

        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        total = self.db.scalar(count_query) or 0

        query = (
            query.order_by(
                Student.first_name,
                Student.last_name,
                Student.id,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(
            self.db.scalars(query).all()
        )

        return items, total

    def save(
        self,
        student: Student,
    ) -> Student:
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def bulk_set_active(
        self,
        student_ids: list[int],
        is_active: bool,
    ) -> list[Student]:
        if not student_ids:
            return []

        students = list(
            self.db.scalars(
                select(Student).where(
                    Student.id.in_(student_ids)
                )
            ).all()
        )

        for student in students:
            student.is_active = is_active
            student.status = (
                "active"
                if is_active
                else "inactive"
            )

        self.db.commit()

        for student in students:
            self.db.refresh(student)

        return students

    def list_parent_links(
        self,
        student_id: int,
    ) -> list[StudentParent]:
        query = (
            select(StudentParent)
            .where(
                StudentParent.student_id == student_id
            )
            .order_by(StudentParent.id)
        )

        return list(
            self.db.scalars(query).all()
        )

    def get_parent_link(
        self,
        student_id: int,
        parent_id: int,
    ) -> StudentParent | None:
        query = select(StudentParent).where(
            StudentParent.student_id == student_id,
            StudentParent.parent_id == parent_id,
        )

        return self.db.scalar(query)

    def add_parent_link(
        self,
        link: StudentParent,
    ) -> StudentParent:
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def delete_parent_link(
        self,
        link: StudentParent,
    ) -> None:
        self.db.delete(link)
        self.db.commit()