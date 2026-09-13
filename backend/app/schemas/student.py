from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


ALLOWED_STUDENT_STATUSES = {
    "active",
    "inactive",
    "transferred",
    "graduated",
    "left",
    "suspended",
}


class StudentBase(BaseModel):
    admission_number: str = Field(min_length=1, max_length=50)
    roll_number: str | None = Field(default=None, max_length=30)

    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)

    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    blood_group: str | None = Field(default=None, max_length=10)

    photo_url: str | None = None
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="India", max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)

    status: str = Field(default="active", max_length=30)
    is_active: bool = True

    @field_validator("admission_number", "first_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().lower()

        if value not in ALLOWED_STUDENT_STATUSES:
            raise ValueError(
                f"Invalid student status. Allowed values: "
                f"{sorted(ALLOWED_STUDENT_STATUSES)}"
            )

        return value


class StudentCreate(StudentBase):
    school_id: int = Field(gt=0)
    academic_session_id: int = Field(gt=0)


class StudentUpdate(BaseModel):
    admission_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    roll_number: str | None = Field(default=None, max_length=30)

    first_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)

    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    blood_group: str | None = Field(default=None, max_length=10)

    photo_url: str | None = None
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)

    status: str | None = Field(default=None, max_length=30)
    is_active: bool | None = None

    @field_validator("admission_number", "first_name")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        if value not in ALLOWED_STUDENT_STATUSES:
            raise ValueError(
                f"Invalid student status. Allowed values: "
                f"{sorted(ALLOWED_STUDENT_STATUSES)}"
            )

        return value


class StudentStatusUpdate(BaseModel):
    is_active: bool


class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    academic_session_id: int
    created_at: datetime
    updated_at: datetime


class StudentParentLinkCreate(BaseModel):
    parent_id: int = Field(gt=0)
    relationship_type: str = Field(min_length=1, max_length=30)
    is_primary: bool = False
    is_emergency_contact: bool = False

    @field_validator("relationship_type")
    @classmethod
    def validate_relationship_type(cls, value: str) -> str:
        value = value.strip().lower()

        if not value:
            raise ValueError("Relationship type cannot be empty.")

        return value


class StudentParentLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    parent_id: int
    relationship_type: str
    is_primary: bool
    is_emergency_contact: bool
    created_at: datetime