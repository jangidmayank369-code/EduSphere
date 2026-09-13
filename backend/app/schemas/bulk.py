from pydantic import BaseModel, Field


class BulkStudentStatusUpdate(BaseModel):
    student_ids: list[int] = Field(
        ...,
        min_length=1,
        description="Student IDs to update.",
    )
    is_active: bool


class BulkParentStatusUpdate(BaseModel):
    parent_ids: list[int] = Field(
        ...,
        min_length=1,
        description="Parent IDs to update.",
    )
    is_active: bool