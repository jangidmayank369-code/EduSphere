"""add student parent documents

Revision ID: add_student_parent_documents
Revises: add_students_and_parents
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa


revision = "add_student_parent_documents"
down_revision = "add_students_and_parents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "school_id",
            sa.Integer(),
            sa.ForeignKey("schools.id", ondelete="CASCADE"),
            nullable=False,
        ),

        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=True,
        ),

        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("parents.id", ondelete="CASCADE"),
            nullable=True,
        ),

        sa.Column("document_type", sa.String(length=50), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),

        sa.Column(
            "verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="pending",
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.UniqueConstraint(
            "storage_key",
            name="uq_documents_storage_key",
        ),
    )

    op.create_index(
        "ix_documents_school_id",
        "documents",
        ["school_id"],
    )

    op.create_index(
        "ix_documents_student_id",
        "documents",
        ["student_id"],
    )

    op.create_index(
        "ix_documents_parent_id",
        "documents",
        ["parent_id"],
    )

    op.create_index(
        "ix_documents_document_type",
        "documents",
        ["document_type"],
    )

    op.create_index(
        "ix_documents_verification_status",
        "documents",
        ["verification_status"],
    )

    op.create_index(
        "ix_documents_is_active",
        "documents",
        ["is_active"],
    )

    op.create_index(
        "ix_documents_is_archived",
        "documents",
        ["is_archived"],
    )


def downgrade() -> None:
    op.drop_index("ix_documents_is_archived", table_name="documents")
    op.drop_index("ix_documents_is_active", table_name="documents")
    op.drop_index("ix_documents_verification_status", table_name="documents")
    op.drop_index("ix_documents_document_type", table_name="documents")
    op.drop_index("ix_documents_parent_id", table_name="documents")
    op.drop_index("ix_documents_student_id", table_name="documents")
    op.drop_index("ix_documents_school_id", table_name="documents")

    op.drop_table("documents")