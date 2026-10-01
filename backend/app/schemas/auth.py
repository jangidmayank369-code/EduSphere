from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    expires_at: datetime | None = None

    # MFA login challenge
    mfa_required: bool = False
    mfa_challenge_token: str | None = None


class CurrentUserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool

    # RBAC context required by the frontend
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)