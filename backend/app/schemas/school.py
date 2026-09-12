from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SchoolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=50)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="India", max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)
    affiliation: str | None = Field(default=None, max_length=150)
    principal_name: str | None = Field(default=None, max_length=200)
    logo_url: str | None = Field(default=None, max_length=500)


class SchoolUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)
    affiliation: str | None = Field(default=None, max_length=150)
    principal_name: str | None = Field(default=None, max_length=200)
    logo_url: str | None = Field(default=None, max_length=500)


class SchoolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    state: str | None
    country: str
    postal_code: str | None
    website: str | None
    affiliation: str | None
    principal_name: str | None
    logo_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AcademicSessionCreate(BaseModel):
    school_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=50)
    start_date: date
    end_date: date


class AcademicSessionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    start_date: date | None = None
    end_date: date | None = None


class AcademicSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime