from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdmissionCreate(BaseModel):
    school_id: int = Field(..., ge=1)
    academic_session_id: int = Field(..., ge=1)

    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(
        default=None,
        max_length=100,
    )
    last_name: str | None = Field(
        default=None,
        max_length=100,
    )

    date_of_birth: date | None = None
    gender: str | None = Field(
        default=None,
        max_length=30,
    )
    blood_group: str | None = Field(
        default=None,
        max_length=10,
    )
    photo_url: str | None = Field(
        default=None,
        max_length=500,
    )

    class_applied: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    previous_school: str | None = Field(
        default=None,
        max_length=255,
    )
    previous_class: str | None = Field(
        default=None,
        max_length=50,
    )

    parent_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )
    parent_relationship: str | None = Field(
        default=None,
        max_length=50,
    )
    parent_phone: str = Field(
        ...,
        min_length=5,
        max_length=30,
    )
    parent_email: EmailStr | None = None

    address: str | None = None
    city: str | None = Field(
        default=None,
        max_length=100,
    )
    state: str | None = Field(
        default=None,
        max_length=100,
    )
    country: str = Field(
        default="India",
        max_length=100,
    )
    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )

    enquiry_source: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


class AdmissionUpdate(BaseModel):
    academic_session_id: int | None = Field(
        default=None,
        ge=1,
    )

    first_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    middle_name: str | None = Field(
        default=None,
        max_length=100,
    )
    last_name: str | None = Field(
        default=None,
        max_length=100,
    )

    date_of_birth: date | None = None
    gender: str | None = Field(
        default=None,
        max_length=30,
    )
    blood_group: str | None = Field(
        default=None,
        max_length=10,
    )
    photo_url: str | None = Field(
        default=None,
        max_length=500,
    )

    class_applied: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    previous_school: str | None = Field(
        default=None,
        max_length=255,
    )
    previous_class: str | None = Field(
        default=None,
        max_length=50,
    )

    parent_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    parent_relationship: str | None = Field(
        default=None,
        max_length=50,
    )
    parent_phone: str | None = Field(
        default=None,
        min_length=5,
        max_length=30,
    )
    parent_email: EmailStr | None = None

    address: str | None = None
    city: str | None = Field(
        default=None,
        max_length=100,
    )
    state: str | None = Field(
        default=None,
        max_length=100,
    )
    country: str | None = Field(
        default=None,
        max_length=100,
    )
    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )

    enquiry_source: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


class AdmissionStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        min_length=1,
        max_length=40,
    )
    rejection_reason: str | None = None


class AdmissionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    school_id: int
    academic_session_id: int

    application_number: str
    admission_number: str | None

    status: str

    first_name: str
    middle_name: str | None
    last_name: str | None

    date_of_birth: date | None
    gender: str | None
    blood_group: str | None
    photo_url: str | None

    class_applied: str

    previous_school: str | None
    previous_class: str | None

    parent_name: str
    parent_relationship: str | None
    parent_phone: str
    parent_email: EmailStr | None

    address: str | None
    city: str | None
    state: str | None
    country: str
    postal_code: str | None

    enquiry_source: str | None
    notes: str | None
    rejection_reason: str | None

    confirmed_student_id: int | None

    created_at: datetime
    updated_at: datetime