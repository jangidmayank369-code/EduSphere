from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_by_id(self, notification_id: int) -> Notification | None:
        return self.db.get(Notification, notification_id)

    def list_for_user(
        self,
        user_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int]:
        query = select(Notification).where(
            Notification.recipient_user_id == user_id
        )

        if unread_only:
            query = query.where(
                Notification.is_read.is_(False)
            )

        count_query = select(
            func.count(Notification.id)
        ).where(
            Notification.recipient_user_id == user_id
        )

        if unread_only:
            count_query = count_query.where(
                Notification.is_read.is_(False)
            )

        total = self.db.scalar(count_query) or 0

        query = (
            query
            .order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(query).all())

        return items, total

    def save(self, notification: Notification) -> Notification:
        self.db.commit()
        self.db.refresh(notification)
        return notification