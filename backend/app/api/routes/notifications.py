from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification import NotificationService


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("")
def list_notifications(
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications, total = NotificationService(db).list_for_user(
        current_user.id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
    )

    total_pages = (
        (total + page_size - 1) // page_size
        if total
        else 0
    )

    return {
        "success": True,
        "data": [
            NotificationResponse.model_validate(
                notification
            ).model_dump()
            for notification in notifications
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.get("/{notification_id}")
def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = NotificationService(db).get(
        notification_id
    )

    # A user can only view their own notifications.
    if notification.recipient_user_id != current_user.id:
        from app.core.exceptions import ForbiddenError

        raise ForbiddenError(
            "You do not have access to this notification.",
            code="NOTIFICATION_ACCESS_DENIED",
        )

    return {
        "success": True,
        "data": NotificationResponse.model_validate(
            notification
        ).model_dump(),
    }


@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = NotificationService(db).get(
        notification_id
    )

    # A user can only mark their own notification as read.
    if notification.recipient_user_id != current_user.id:
        from app.core.exceptions import ForbiddenError

        raise ForbiddenError(
            "You do not have access to this notification.",
            code="NOTIFICATION_ACCESS_DENIED",
        )

    notification = NotificationService(db).mark_as_read(
        notification_id
    )

    return {
        "success": True,
        "data": NotificationResponse.model_validate(
            notification
        ).model_dump(),
    }