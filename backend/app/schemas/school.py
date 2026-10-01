from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# SCHOOL
# ============================================================================


class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)

    # Contact
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="India", max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)

    # Affiliation / registration
    affiliation: str | None = Field(default=None, max_length=255)
    affiliation_number: str | None = Field(default=None, max_length=100)
    registration_number: str | None = Field(default=None, max_length=100)
    recognition_number: str | None = Field(default=None, max_length=100)
    udise_code: str | None = Field(default=None, max_length=50)
    school_type: str | None = Field(default=None, max_length=50)
    management_type: str | None = Field(default=None, max_length=100)
    established_year: int | None = Field(default=None, ge=1800, le=2100)

    # Tax / financial
    pan_number: str | None = Field(default=None, max_length=20)
    tan_number: str | None = Field(default=None, max_length=20)
    gst_number: str | None = Field(default=None, max_length=30)

    # Leadership
    principal_name: str | None = Field(default=None, max_length=255)
    principal_email: str | None = Field(default=None, max_length=255)
    principal_phone: str | None = Field(default=None, max_length=30)

    # Branding
    logo_url: str | None = Field(default=None, max_length=2000)
    favicon_url: str | None = Field(default=None, max_length=2000)
    primary_color: str | None = Field(default=None, max_length=20)
    secondary_color: str | None = Field(default=None, max_length=20)
    tagline: str | None = Field(default=None, max_length=255)

    # Academic configuration
    academic_year_start_month: int = Field(default=4, ge=1, le=12)
    academic_year_end_month: int = Field(default=3, ge=1, le=12)
    grading_system: str | None = Field(default=None, max_length=100)
    attendance_type: str | None = Field(default=None, max_length=50)
    working_days_per_week: int | None = Field(
        default=None,
        ge=1,
        le=7,
    )

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator(
        "name",
        "country",
        "city",
        "state",
        "affiliation",
        "school_type",
        "management_type",
        "grading_system",
        "attendance_type",
        mode="before",
    )
    @classmethod
    def normalize_text(cls, value):
        if value is None:
            return value

        value = str(value).strip()
        return value or None


class SchoolUpdate(BaseModel):
    """
    PATCH schema.

    `code` intentionally remains immutable after school creation because it
    is the unique school identifier used across the system.
    """

    name: str | None = Field(default=None, min_length=2, max_length=255)

    # Contact
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)

    # Affiliation / registration
    affiliation: str | None = Field(default=None, max_length=255)
    affiliation_number: str | None = Field(default=None, max_length=100)
    registration_number: str | None = Field(default=None, max_length=100)
    recognition_number: str | None = Field(default=None, max_length=100)
    udise_code: str | None = Field(default=None, max_length=50)
    school_type: str | None = Field(default=None, max_length=50)
    management_type: str | None = Field(default=None, max_length=100)
    established_year: int | None = Field(default=None, ge=1800, le=2100)

    # Tax / financial
    pan_number: str | None = Field(default=None, max_length=20)
    tan_number: str | None = Field(default=None, max_length=20)
    gst_number: str | None = Field(default=None, max_length=30)

    # Leadership
    principal_name: str | None = Field(default=None, max_length=255)
    principal_email: str | None = Field(default=None, max_length=255)
    principal_phone: str | None = Field(default=None, max_length=30)

    # Branding
    logo_url: str | None = Field(default=None, max_length=2000)
    favicon_url: str | None = Field(default=None, max_length=2000)
    primary_color: str | None = Field(default=None, max_length=20)
    secondary_color: str | None = Field(default=None, max_length=20)
    tagline: str | None = Field(default=None, max_length=255)

    # Academic configuration
    academic_year_start_month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )
    academic_year_end_month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )
    grading_system: str | None = Field(default=None, max_length=100)
    attendance_type: str | None = Field(default=None, max_length=50)
    working_days_per_week: int | None = Field(
        default=None,
        ge=1,
        le=7,
    )


class SchoolStatusUpdate(BaseModel):
    is_active: bool


class SchoolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    # Identity
    name: str
    code: str

    # Contact
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str
    postal_code: str | None = None
    website: str | None = None

    # Affiliation / registration
    affiliation: str | None = None
    affiliation_number: str | None = None
    registration_number: str | None = None
    recognition_number: str | None = None
    udise_code: str | None = None
    school_type: str | None = None
    management_type: str | None = None
    established_year: int | None = None

    # Tax
    pan_number: str | None = None
    tan_number: str | None = None
    gst_number: str | None = None

    # Leadership
    principal_name: str | None = None
    principal_email: str | None = None
    principal_phone: str | None = None

    # Branding
    logo_url: str | None = None
    favicon_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    tagline: str | None = None

    # Academic configuration
    academic_year_start_month: int
    academic_year_end_month: int
    grading_system: str | None = None
    attendance_type: str | None = None
    working_days_per_week: int | None = None

    # Status / timestamps
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SchoolListResponse(BaseModel):
    items: list[SchoolResponse]
    meta: dict


# ============================================================================
# ACADEMIC SESSION
# ============================================================================


class AcademicSessionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Session name cannot be empty.")

        return value

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info):
        start_date = info.data.get("start_date")

        if start_date is not None and value <= start_date:
            raise ValueError("End date must be after start date.")

        return value


class AcademicSessionUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Session name cannot be empty.")

        return value


class AcademicSessionStatusUpdate(BaseModel):
    is_active: bool


class AcademicSessionArchiveUpdate(BaseModel):
    is_archived: bool


class AcademicSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int

    name: str
    start_date: date
    end_date: date

    is_current: bool
    is_active: bool
    is_closed: bool
    is_archived: bool

    closed_at: datetime | None = None
    archived_at: datetime | None = None

    cloned_from_session_id: int | None = None
    carried_forward_from_session_id: int | None = None

    created_at: datetime
    updated_at: datetime


class AcademicSessionListResponse(BaseModel):
    items: list[AcademicSessionResponse]
    meta: dict


# ============================================================================
# SESSION CLONE / CARRY FORWARD
# ============================================================================


class AcademicSessionCloneRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date
    carry_forward: bool = False

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Session name cannot be empty.")

        return value

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info):
        start_date = info.data.get("start_date")

        if start_date is not None and value <= start_date:
            raise ValueError("End date must be after start date.")

        return value