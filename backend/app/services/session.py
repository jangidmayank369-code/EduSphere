from datetime import datetime

from sqlalchemy.orm import Session

from app.models.session import UserSession
from app.repositories.session import SessionRepository


class SessionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = SessionRepository(db)

    def create(
        self,
        *,
        user_id: int,
        jti: str,
        expires_at: datetime,
        ip_address: str | None,
        user_agent: str | None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            jti=jti,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return self.repository.create(session)

    def get_active_by_jti(
        self,
        jti: str,
    ) -> UserSession | None:
        return self.repository.get_active_by_jti(jti)

    def touch(
        self,
        session: UserSession,
        *,
        commit: bool = True,
    ) -> UserSession:
        return self.repository.touch(
            session,
            commit=commit,
        )

    def list_for_user(
        self,
        user_id: int,
    ) -> list[UserSession]:
        return self.repository.list_for_user(user_id)

    def revoke(
        self,
        session: UserSession,
    ) -> UserSession:
        return self.repository.revoke(session)

    def revoke_for_user(
        self,
        user_id: int,
    ) -> int:
        return self.repository.revoke_for_user(user_id)

    def revoke_all_for_user(
        self,
        user_id: int,
        except_jti: str | None = None,
    ) -> int:
        return self.repository.revoke_all_for_user(
            user_id,
            except_jti,
        )