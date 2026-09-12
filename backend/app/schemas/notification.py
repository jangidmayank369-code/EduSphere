from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    recipient_user_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    notification_type: str = Field(min_length=1, max_length=100)
    channel: str = Field(
        default="IN_APP",
        min_length=1,
        max_length=50,
    )
    extra_data: dict | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_user_id: int
    title: str
    message: str
    notification_type: str
    channel: str
    is_read: bool
    read_at: datetime | None
    extra_data: dict | None
    created_at: datetime