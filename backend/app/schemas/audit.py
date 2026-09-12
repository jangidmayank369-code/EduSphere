from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    actor_user_id: int | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    request_id: str | None = None
    details: dict | None = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: int | None
    action: str
    resource_type: str
    resource_id: str | None
    request_id: str | None
    details: dict | None
    created_at: datetime