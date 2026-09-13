from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ParentBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)

    relationship_type: str | None = Field(default=None, max_length=30)

    phone: str | None = Field(default=None, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    occupation: str | None = Field(default=None, max_length=150)

    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="India", max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)

    photo_url: str | None = None

    is_primary_contact: bool = False
    is_emergency_contact: bool = False
    is_active: bool = True

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("First name cannot be empty.")

        return value

    @field_validator("relationship_type")
    @classmethod
    def validate_relationship_type(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        return value or None


class ParentCreate(ParentBase):
    school_id: int = Field(gt=0)


class ParentUpdate(BaseModel):
    first_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)

    relationship_type: str | None = Field(default=None, max_length=30)

    phone: str | None = Field(default=None, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None

    occupation: str | None = Field(default=None, max_length=150)

    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)

    photo_url: str | None = None

    is_primary_contact: bool | None = None
    is_emergency_contact: bool | None = None
    is_active: bool | None = None

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("First name cannot be empty.")

        return value

    @field_validator("relationship_type")
    @classmethod
    def validate_relationship_type(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        return value or None


class ParentStatusUpdate(BaseModel):
    is_active: bool


class ParentResponse(ParentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    created_at: datetime
    updated_at: datetime


class StudentParentLinkUpdate(BaseModel):
    relationship_type: str | None = Field(
        default=None,
        max_length=30,
    )
    is_primary: bool | None = None
    is_emergency_contact: bool | None = None

    @field_validator("relationship_type")
    @classmethod
    def validate_relationship_type(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().lower()

        return value or None