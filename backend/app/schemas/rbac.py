from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

class RoleCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class RoleUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class RoleResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    description: str | None = None


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

class PermissionCreate(BaseModel):
    code: str = Field(
        min_length=1,
        max_length=150,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class PermissionUpdate(BaseModel):
    code: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class PermissionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    code: str
    description: str | None = None


# ---------------------------------------------------------------------------
# Assignment
# ---------------------------------------------------------------------------

class AssignmentRequest(BaseModel):
    id: int = Field(
        gt=0,
    )


class UserPermissionsResponse(BaseModel):
    user_id: int
    permissions: list[str] = Field(
        default_factory=list,
    )