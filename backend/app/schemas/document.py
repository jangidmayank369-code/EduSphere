from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DocumentCreate(BaseModel):
    school_id: int = Field(gt=0)
    student_id: int | None = Field(default=None, gt=0)
    parent_id: int | None = Field(default=None, gt=0)

    document_type: str = Field(min_length=1, max_length=50)
    original_filename: str = Field(min_length=1, max_length=255)
    storage_key: str = Field(min_length=1, max_length=500)
    mime_type: str = Field(min_length=1, max_length=100)
    file_size: int = Field(ge=1)
    description: str | None = None

    verification_status: str = Field(
        default="pending",
        min_length=1,
        max_length=30,
    )

    @model_validator(mode="after")
    def validate_owner(self):
        if self.student_id is None and self.parent_id is None:
            raise ValueError(
                "Document must belong to either a student or a parent."
            )

        if self.student_id is not None and self.parent_id is not None:
            raise ValueError(
                "Document cannot belong to both a student and a parent."
            )

        return self


class DocumentUpdate(BaseModel):
    document_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    description: str | None = None

    verification_status: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )


class DocumentStatusUpdate(BaseModel):
    is_active: bool


class DocumentArchiveUpdate(BaseModel):
    is_archived: bool


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    student_id: int | None
    parent_id: int | None

    document_type: str
    original_filename: str
    storage_key: str
    mime_type: str
    file_size: int
    description: str | None

    verification_status: str
    is_active: bool
    is_archived: bool

    created_at: datetime
    updated_at: datetime


class BulkStudentAction(BaseModel):
    student_ids: list[int] = Field(min_length=1)
    is_active: bool


class BulkParentAction(BaseModel):
    parent_ids: list[int] = Field(min_length=1)
    is_active: bool


class BulkDocumentAction(BaseModel):
    document_ids: list[int] = Field(min_length=1)
    is_active: bool | None = None
    is_archived: bool | None = None