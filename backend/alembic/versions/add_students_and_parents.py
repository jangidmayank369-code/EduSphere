"""add students and parents

Revision ID: add_students_and_parents
Revises: add_school_session_integrity
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_students_and_parents"
down_revision: Union[str, Sequence[str], None] = "add_school_session_integrity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("middle_name", sa.String(length=100), nullable=True),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("relationship_type", sa.String(length=30), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("alternate_phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("occupation", sa.String(length=150), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="India"),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("is_primary_contact", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_emergency_contact", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            name="fk_parents_school_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_parents_school_id", "parents", ["school_id"], unique=False)
    op.create_index("ix_parents_phone", "parents", ["phone"], unique=False)
    op.create_index("ix_parents_email", "parents", ["email"], unique=False)
    op.create_index("ix_parents_is_active", "parents", ["is_active"], unique=False)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("academic_session_id", sa.Integer(), nullable=False),
        sa.Column("admission_number", sa.String(length=50), nullable=False),
        sa.Column("roll_number", sa.String(length=30), nullable=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("middle_name", sa.String(length=100), nullable=True),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=30), nullable=True),
        sa.Column("blood_group", sa.String(length=10), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="India"),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            name="fk_students_school_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["academic_session_id"],
            ["academic_sessions.id"],
            name="fk_students_academic_session_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_students_school_id", "students", ["school_id"], unique=False)
    op.create_index("ix_students_academic_session_id", "students", ["academic_session_id"], unique=False)
    op.create_index("ix_students_admission_number", "students", ["admission_number"], unique=False)
    op.create_index("ix_students_status", "students", ["status"], unique=False)
    op.create_index("ix_students_is_active", "students", ["is_active"], unique=False)

    op.create_table(
        "student_parents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("relationship_type", sa.String(length=30), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_emergency_contact", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["parents.id"],
            name="fk_student_parents_parent_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            name="fk_student_parents_student_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "parent_id", name="uq_student_parent"),
    )

    op.create_index("ix_student_parents_student_id", "student_parents", ["student_id"], unique=False)
    op.create_index("ix_student_parents_parent_id", "student_parents", ["parent_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_student_parents_parent_id", table_name="student_parents")
    op.drop_index("ix_student_parents_student_id", table_name="student_parents")
    op.drop_table("student_parents")

    op.drop_index("ix_students_is_active", table_name="students")
    op.drop_index("ix_students_status", table_name="students")
    op.drop_index("ix_students_admission_number", table_name="students")
    op.drop_index("ix_students_academic_session_id", table_name="students")
    op.drop_index("ix_students_school_id", table_name="students")
    op.drop_table("students")

    op.drop_index("ix_parents_is_active", table_name="parents")
    op.drop_index("ix_parents_email", table_name="parents")
    op.drop_index("ix_parents_phone", table_name="parents")
    op.drop_index("ix_parents_school_id", table_name="parents")
    op.drop_table("parents")
