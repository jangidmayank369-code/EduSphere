from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.notification import Notification
from app.repositories.notification import NotificationRepository


class NotificationService:
    def __init__(self, db: Session):
        self.repository = NotificationRepository(db)

    def create(
        self,
        *,
        recipient_user_id: int,
        title: str,
        message: str,
        notification_type: str,
        channel: str = "IN_APP",
        extra_data: dict | None = None,
    ) -> Notification:
        notification = Notification(
            recipient_user_id=recipient_user_id,
            title=title.strip(),
            message=message.strip(),
            notification_type=notification_type.strip().upper(),
            channel=channel.strip().upper(),
            extra_data=extra_data,
        )

        return self.repository.create(notification)

    def get(self, notification_id: int) -> Notification:
        notification = self.repository.get_by_id(notification_id)

        if not notification:
            raise NotFoundError(
                "Notification not found.",
                code="NOTIFICATION_NOT_FOUND",
            )

        return notification

    def list_for_user(
        self,
        user_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int]:
        return self.repository.list_for_user(
            user_id,
            page=page,
            page_size=page_size,
            unread_only=unread_only,
        )

    def mark_as_read(
        self,
        notification_id: int,
    ) -> Notification:
        notification = self.get(notification_id)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            notification = self.repository.save(notification)

        return notification