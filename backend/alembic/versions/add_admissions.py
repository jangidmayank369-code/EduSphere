"""add admissions

Revision ID: add_admissions
Revises: add_student_parent_documents
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa


revision = "add_admissions"
down_revision = "add_student_parent_documents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admissions",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "school_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "academic_session_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "application_number",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "admission_number",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
        ),

        sa.Column(
            "first_name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "middle_name",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "last_name",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "date_of_birth",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "gender",
            sa.String(length=30),
            nullable=True,
        ),

        sa.Column(
            "blood_group",
            sa.String(length=10),
            nullable=True,
        ),

        sa.Column(
            "photo_url",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "class_applied",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "previous_school",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "previous_class",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "parent_name",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "parent_relationship",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "parent_phone",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "parent_email",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "address",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "city",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "state",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "country",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "postal_code",
            sa.String(length=20),
            nullable=True,
        ),

        sa.Column(
            "enquiry_source",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "rejection_reason",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "confirmed_student_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["academic_session_id"],
            ["academic_sessions.id"],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            ["confirmed_student_id"],
            ["students.id"],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "application_number",
            name="uq_admissions_application_number",
        ),

        sa.UniqueConstraint(
            "admission_number",
            name="uq_admissions_admission_number",
        ),
    )

    op.create_index(
        "ix_admissions_school_id",
        "admissions",
        ["school_id"],
    )

    op.create_index(
        "ix_admissions_academic_session_id",
        "admissions",
        ["academic_session_id"],
    )

    op.create_index(
        "ix_admissions_status",
        "admissions",
        ["status"],
    )

    op.create_index(
        "ix_admissions_application_number",
        "admissions",
        ["application_number"],
    )

    op.create_index(
        "ix_admissions_admission_number",
        "admissions",
        ["admission_number"],
    )

    op.create_index(
        "ix_admissions_class_applied",
        "admissions",
        ["class_applied"],
    )

    op.create_index(
        "ix_admissions_confirmed_student_id",
        "admissions",
        ["confirmed_student_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_admissions_confirmed_student_id",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_class_applied",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_admission_number",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_application_number",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_status",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_academic_session_id",
        table_name="admissions",
    )

    op.drop_index(
        "ix_admissions_school_id",
        table_name="admissions",
    )

    op.drop_table("admissions")