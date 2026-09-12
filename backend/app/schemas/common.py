from typing import Generic, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SortParams(BaseModel):
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class ListQueryParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = Field(default=None, min_length=1, max_length=200)
    sort_by: str | None = Field(default=None, max_length=100)
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")
    status: str | None = Field(default=None, max_length=50)


class PaginationMeta(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    total: int = Field(default=0, ge=0)
    total_pages: int = Field(default=0, ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    meta: PaginationMeta