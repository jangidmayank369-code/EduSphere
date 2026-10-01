from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.session import UserSession


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, session: UserSession) -> UserSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_active_by_jti(
        self,
        jti: str,
    ) -> UserSession | None:
        now = datetime.now(timezone.utc)

        return self.db.scalar(
            select(UserSession).where(
                UserSession.jti == jti,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
        )

    def touch(
        self,
        session: UserSession,
        *,
        commit: bool = True,
    ) -> UserSession:
        session.last_seen_at = datetime.now(timezone.utc)

        if commit:
            self.db.commit()
            self.db.refresh(session)

        return session

    def list_for_user(
        self,
        user_id: int,
    ) -> list[UserSession]:
        return list(
            self.db.scalars(
                select(UserSession)
                .where(UserSession.user_id == user_id)
                .order_by(UserSession.created_at.desc())
            ).all()
        )

    def revoke(
        self,
        session: UserSession,
        *,
        commit: bool = True,
    ) -> UserSession:
        if session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)

        if commit:
            self.db.commit()
            self.db.refresh(session)

        return session

    def revoke_for_user(
        self,
        user_id: int,
        *,
        commit: bool = True,
    ) -> int:
        result = self.db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(
                revoked_at=datetime.now(timezone.utc)
            )
        )

        if commit:
            self.db.commit()

        return result.rowcount or 0

    def revoke_all_for_user(
        self,
        user_id: int,
        except_jti: str | None = None,
        *,
        commit: bool = True,
    ) -> int:
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
        )

        if except_jti:
            stmt = stmt.where(
                UserSession.jti != except_jti
            )

        result = self.db.execute(
            stmt.values(
                revoked_at=datetime.now(timezone.utc)
            )
        )

        if commit:
            self.db.commit()

        return result.rowcount or 0