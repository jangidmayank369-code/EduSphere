from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None


class PermissionCreate(BaseModel):
    code: str = Field(min_length=1, max_length=150)
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class PermissionResponse(BaseModel):
    id: int
    code: str
    description: str | None


class AssignmentRequest(BaseModel):
    id: int = Field(gt=0)


class UserPermissionsResponse(BaseModel):
    user_id: int
    permissions: list[str]