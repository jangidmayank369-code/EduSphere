from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.audit import AuditLog
from app.repositories.audit import AuditRepository


class AuditService:
    def __init__(self, db: Session):
        self.repository = AuditRepository(db)

    def create(
        self,
        *,
        action: str,
        resource_type: str,
        actor_user_id: int | None = None,
        resource_id: str | None = None,
        request_id: str | None = None,
        details: dict | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            actor_user_id=actor_user_id,
            action=action.strip().upper(),
            resource_type=resource_type.strip().upper(),
            resource_id=resource_id,
            request_id=request_id,
            details=details,
        )

        return self.repository.create(audit_log)

    def get(self, audit_id: int) -> AuditLog:
        audit_log = self.repository.get_by_id(audit_id)

        if not audit_log:
            raise NotFoundError(
                "Audit log not found.",
                code="AUDIT_LOG_NOT_FOUND",
            )

        return audit_log

    def list(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        action: str | None = None,
        resource_type: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[list[AuditLog], int]:
        return self.repository.list(
            page=page,
            page_size=page_size,
            action=action,
            resource_type=resource_type,
            actor_user_id=actor_user_id,
        )