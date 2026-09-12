from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, audit_log: AuditLog) -> AuditLog:
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log

    def get_by_id(self, audit_id: int) -> AuditLog | None:
        return self.db.get(AuditLog, audit_id)

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        action: str | None = None,
        resource_type: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog)

        if action:
            query = query.where(AuditLog.action == action)

        if resource_type:
            query = query.where(
                AuditLog.resource_type == resource_type
            )

        if actor_user_id is not None:
            query = query.where(
                AuditLog.actor_user_id == actor_user_id
            )

        count_query = select(AuditLog.id)

        if action:
            count_query = count_query.where(
                AuditLog.action == action
            )

        if resource_type:
            count_query = count_query.where(
                AuditLog.resource_type == resource_type
            )

        if actor_user_id is not None:
            count_query = count_query.where(
                AuditLog.actor_user_id == actor_user_id
            )

        total = len(self.db.scalars(count_query).all())

        query = (
            query
            .order_by(AuditLog.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        items = list(self.db.scalars(query).all())

        return items, total