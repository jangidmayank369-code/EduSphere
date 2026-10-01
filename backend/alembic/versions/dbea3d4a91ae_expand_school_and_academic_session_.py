"""expand school and academic session management

Revision ID: dbea3d4a91ae
Revises: be74e9c3231a
Create Date: 2026-09-14 18:18:47.314963

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "dbea3d4a91ae"
down_revision: Union[str, Sequence[str], None] = "be74e9c3231a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ======================================================================
    # ACADEMIC SESSION
    # ======================================================================

    # Add lifecycle columns as nullable first so existing rows remain safe.
    op.add_column(
        "academic_sessions",
        sa.Column(
            "is_closed",
            sa.Boolean(),
            nullable=True,
        ),
    )

    op.add_column(
        "academic_sessions",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=True,
        ),
    )

    op.add_column(
        "academic_sessions",
        sa.Column(
            "closed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "academic_sessions",
        sa.Column(
            "archived_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "academic_sessions",
        sa.Column(
            "cloned_from_session_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "academic_sessions",
        sa.Column(
            "carried_forward_from_session_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Existing sessions were previously active and not archived/closed.
    op.execute(
        """
        UPDATE academic_sessions
        SET
            is_closed = FALSE,
            is_archived = FALSE
        WHERE is_closed IS NULL
           OR is_archived IS NULL
        """
    )

    # Now enforce the model's non-null contract.
    op.alter_column(
        "academic_sessions",
        "is_closed",
        existing_type=sa.Boolean(),
        nullable=False,
    )

    op.alter_column(
        "academic_sessions",
        "is_archived",
        existing_type=sa.Boolean(),
        nullable=False,
    )

    # Indexes.
    op.create_index(
        "ix_academic_sessions_carried_forward_from_session_id",
        "academic_sessions",
        ["carried_forward_from_session_id"],
        unique=False,
    )

    op.create_index(
        "ix_academic_sessions_cloned_from_session_id",
        "academic_sessions",
        ["cloned_from_session_id"],
        unique=False,
    )

    op.create_index(
        "ix_academic_sessions_is_archived",
        "academic_sessions",
        ["is_archived"],
        unique=False,
    )

    op.create_index(
        "ix_academic_sessions_is_closed",
        "academic_sessions",
        ["is_closed"],
        unique=False,
    )

    # Named self-referencing foreign keys.
    op.create_foreign_key(
        "fk_academic_sessions_cloned_from_session",
        "academic_sessions",
        "academic_sessions",
        ["cloned_from_session_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        "fk_academic_sessions_carried_forward_from_session",
        "academic_sessions",
        "academic_sessions",
        ["carried_forward_from_session_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ======================================================================
    # SCHOOL
    # ======================================================================

    op.add_column(
        "schools",
        sa.Column(
            "affiliation_number",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "registration_number",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "recognition_number",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "udise_code",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "school_type",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "management_type",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "established_year",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "pan_number",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "tan_number",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "gst_number",
            sa.String(length=30),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "principal_email",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "principal_phone",
            sa.String(length=30),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "favicon_url",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "primary_color",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "secondary_color",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "tagline",
            sa.String(length=255),
            nullable=True,
        ),
    )

    # Existing schools need valid defaults for the new academic
    # configuration fields.
    op.add_column(
        "schools",
        sa.Column(
            "academic_year_start_month",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "academic_year_end_month",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "grading_system",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "attendance_type",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "schools",
        sa.Column(
            "working_days_per_week",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Default existing schools to the common April-March academic year.
    op.execute(
        """
        UPDATE schools
        SET
            academic_year_start_month = 4,
            academic_year_end_month = 3
        WHERE academic_year_start_month IS NULL
           OR academic_year_end_month IS NULL
        """
    )

    # Match the SQLAlchemy model's non-null contract.
    op.alter_column(
        "schools",
        "academic_year_start_month",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.alter_column(
        "schools",
        "academic_year_end_month",
        existing_type=sa.Integer(),
        nullable=False,
    )

    # Existing database has VARCHAR(20).
    # Expand it without touching existing values.
    op.alter_column(
        "schools",
        "phone",
        existing_type=sa.VARCHAR(length=20),
        type_=sa.String(length=30),
        existing_nullable=True,
    )

    op.create_index(
        "ix_schools_udise_code",
        "schools",
        ["udise_code"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    # ======================================================================
    # SCHOOL
    # ======================================================================

    op.drop_index(
        "ix_schools_udise_code",
        table_name="schools",
    )

    op.alter_column(
        "schools",
        "phone",
        existing_type=sa.String(length=30),
        type_=sa.VARCHAR(length=20),
        existing_nullable=True,
    )

    op.drop_column(
        "schools",
        "working_days_per_week",
    )

    op.drop_column(
        "schools",
        "attendance_type",
    )

    op.drop_column(
        "schools",
        "grading_system",
    )

    op.drop_column(
        "schools",
        "academic_year_end_month",
    )

    op.drop_column(
        "schools",
        "academic_year_start_month",
    )

    op.drop_column(
        "schools",
        "tagline",
    )

    op.drop_column(
        "schools",
        "secondary_color",
    )

    op.drop_column(
        "schools",
        "primary_color",
    )

    op.drop_column(
        "schools",
        "favicon_url",
    )

    op.drop_column(
        "schools",
        "principal_phone",
    )

    op.drop_column(
        "schools",
        "principal_email",
    )

    op.drop_column(
        "schools",
        "gst_number",
    )

    op.drop_column(
        "schools",
        "tan_number",
    )

    op.drop_column(
        "schools",
        "pan_number",
    )

    op.drop_column(
        "schools",
        "established_year",
    )

    op.drop_column(
        "schools",
        "management_type",
    )

    op.drop_column(
        "schools",
        "school_type",
    )

    op.drop_column(
        "schools",
        "udise_code",
    )

    op.drop_column(
        "schools",
        "recognition_number",
    )

    op.drop_column(
        "schools",
        "registration_number",
    )

    op.drop_column(
        "schools",
        "affiliation_number",
    )

    # ======================================================================
    # ACADEMIC SESSION
    # ======================================================================

    op.drop_constraint(
        "fk_academic_sessions_carried_forward_from_session",
        "academic_sessions",
        type_="foreignkey",
    )

    op.drop_constraint(
        "fk_academic_sessions_cloned_from_session",
        "academic_sessions",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_academic_sessions_is_closed",
        table_name="academic_sessions",
    )

    op.drop_index(
        "ix_academic_sessions_is_archived",
        table_name="academic_sessions",
    )

    op.drop_index(
        "ix_academic_sessions_cloned_from_session_id",
        table_name="academic_sessions",
    )

    op.drop_index(
        "ix_academic_sessions_carried_forward_from_session_id",
        table_name="academic_sessions",
    )

    op.drop_column(
        "academic_sessions",
        "carried_forward_from_session_id",
    )

    op.drop_column(
        "academic_sessions",
        "cloned_from_session_id",
    )

    op.drop_column(
        "academic_sessions",
        "archived_at",
    )

    op.drop_column(
        "academic_sessions",
        "closed_at",
    )

    op.drop_column(
        "academic_sessions",
        "is_archived",
    )

    op.drop_column(
        "academic_sessions",
        "is_closed",
    )