from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.models.mfa_challenge import MFAChallenge


class MFAChallengeService:
    """
    Persistent MFA login challenge management.

    Security guarantees:
    - Every MFA JWT JTI is persisted.
    - A challenge belongs to exactly one user.
    - A challenge can be consumed only once.
    - Expired challenges are rejected.
    - Revoked challenges are rejected.
    - Failed attempts are persisted.
    - Maximum attempts automatically revoke the challenge.
    - Database row locking protects the one-time consumption flow
      against concurrent verification requests.
    """

    DEFAULT_MAX_ATTEMPTS = 5

    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # TIME
    # ============================================================

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    # ============================================================
    # CREATE
    # ============================================================

    def create(
        self,
        *,
        user_id: int,
        jti: str,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
        max_attempts: int | None = None,
    ) -> MFAChallenge:
        """
        Persist a newly-created MFA challenge.

        Existing active challenges for the same user are revoked
        before creating the new challenge.
        """

        if not jti:
            raise UnauthorizedError(
                "Invalid MFA challenge identifier.",
                code="MFA_CHALLENGE_INVALID",
            )

        existing = self.db.execute(
            select(MFAChallenge).where(
                MFAChallenge.jti == jti,
            )
        ).scalar_one_or_none()

        if existing:
            raise UnauthorizedError(
                "Unable to create MFA challenge.",
                code="MFA_CHALLENGE_INVALID",
            )

        self.revoke_active_for_user(
            user_id,
        )

        challenge = MFAChallenge(
            user_id=user_id,
            jti=jti,
            expires_at=expires_at,
            attempts=0,
            max_attempts=(
                max_attempts
                if max_attempts is not None
                else self.DEFAULT_MAX_ATTEMPTS
            ),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(challenge)
        self.db.flush()

        return challenge

    # ============================================================
    # GET / LOCK
    # ============================================================

    def get_by_jti(
        self,
        jti: str,
        *,
        for_update: bool = False,
    ) -> MFAChallenge | None:
        """
        Retrieve a challenge by JTI.

        `FOR UPDATE` is used during verification so two concurrent
        requests cannot both successfully consume the same challenge.
        """

        statement = select(MFAChallenge).where(
            MFAChallenge.jti == jti,
        )

        if for_update:
            statement = statement.with_for_update()

        return self.db.execute(
            statement
        ).scalar_one_or_none()

    # ============================================================
    # VALIDATE
    # ============================================================

    def validate(
        self,
        *,
        user_id: int,
        jti: str,
        for_update: bool = False,
    ) -> MFAChallenge:
        """
        Validate an MFA challenge.

        When `for_update=True`, the challenge row is locked until
        the current database transaction completes.
        """

        challenge = self.get_by_jti(
            jti,
            for_update=for_update,
        )

        if not challenge:
            raise UnauthorizedError(
                "Invalid or expired MFA challenge.",
                code="INVALID_MFA_CHALLENGE",
            )

        if challenge.user_id != user_id:
            raise UnauthorizedError(
                "Invalid MFA challenge.",
                code="INVALID_MFA_CHALLENGE",
            )

        now = self._utcnow()

        if challenge.used_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has already been used.",
                code="MFA_CHALLENGE_ALREADY_USED",
            )

        if challenge.revoked_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has been revoked.",
                code="MFA_CHALLENGE_REVOKED",
            )

        if challenge.expires_at <= now:
            raise UnauthorizedError(
                "This MFA challenge has expired.",
                code="MFA_CHALLENGE_EXPIRED",
            )

        if challenge.attempts >= challenge.max_attempts:
            raise UnauthorizedError(
                "Too many MFA verification attempts.",
                code="MFA_CHALLENGE_ATTEMPTS_EXCEEDED",
            )

        return challenge

    # ============================================================
    # FAILED ATTEMPT
    # ============================================================

    def register_failed_attempt(
        self,
        challenge: MFAChallenge,
    ) -> int:
        """
        Register a failed MFA verification attempt.

        The caller should have obtained the challenge with
        `for_update=True`.
        """

        if challenge.used_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has already been used.",
                code="MFA_CHALLENGE_ALREADY_USED",
            )

        if challenge.revoked_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has been revoked.",
                code="MFA_CHALLENGE_REVOKED",
            )

        now = self._utcnow()

        if challenge.expires_at <= now:
            raise UnauthorizedError(
                "This MFA challenge has expired.",
                code="MFA_CHALLENGE_EXPIRED",
            )

        challenge.attempts += 1

        if challenge.attempts >= challenge.max_attempts:
            challenge.revoked_at = now

        self.db.add(challenge)
        self.db.flush()

        return challenge.attempts

    # ============================================================
    # SUCCESSFUL CONSUMPTION
    # ============================================================

    def consume(
        self,
        challenge: MFAChallenge,
    ) -> None:
        """
        Atomically mark a challenge as consumed.

        The challenge should be locked with FOR UPDATE before this
        method is called.
        """

        if challenge.used_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has already been used.",
                code="MFA_CHALLENGE_ALREADY_USED",
            )

        if challenge.revoked_at is not None:
            raise UnauthorizedError(
                "This MFA challenge has been revoked.",
                code="MFA_CHALLENGE_REVOKED",
            )

        now = self._utcnow()

        if challenge.expires_at <= now:
            raise UnauthorizedError(
                "This MFA challenge has expired.",
                code="MFA_CHALLENGE_EXPIRED",
            )

        if challenge.attempts >= challenge.max_attempts:
            raise UnauthorizedError(
                "Too many MFA verification attempts.",
                code="MFA_CHALLENGE_ATTEMPTS_EXCEEDED",
            )

        challenge.used_at = now

        self.db.add(challenge)
        self.db.flush()

    # ============================================================
    # REVOKE
    # ============================================================

    def revoke(
        self,
        challenge: MFAChallenge,
    ) -> None:
        """
        Explicitly revoke an MFA challenge.
        """

        if (
            challenge.used_at is None
            and challenge.revoked_at is None
        ):
            challenge.revoked_at = self._utcnow()

            self.db.add(challenge)
            self.db.flush()

    # ============================================================
    # REVOKE USER'S ACTIVE CHALLENGES
    # ============================================================

    def revoke_active_for_user(
        self,
        user_id: int,
        *,
        except_jti: str | None = None,
    ) -> int:
        """
        Revoke all currently-active MFA challenges belonging
        to a user.

        This ensures that issuing a new MFA challenge invalidates
        older login challenges.
        """

        statement = select(MFAChallenge).where(
            MFAChallenge.user_id == user_id,
            MFAChallenge.used_at.is_(None),
            MFAChallenge.revoked_at.is_(None),
        )

        challenges = list(
            self.db.execute(
                statement
            ).scalars().all()
        )

        if not challenges:
            return 0

        now = self._utcnow()
        revoked_count = 0

        for challenge in challenges:
            if (
                except_jti is not None
                and challenge.jti == except_jti
            ):
                continue

            challenge.revoked_at = now
            self.db.add(challenge)
            revoked_count += 1

        if revoked_count:
            self.db.flush()

        return revoked_count

    # ============================================================
    # CLEANUP EXPIRED CHALLENGES
    # ============================================================

    def revoke_expired_for_user(
        self,
        user_id: int,
    ) -> int:
        """
        Mark expired active challenges as revoked.

        This is optional housekeeping and does not replace the
        expiry check performed during validation.
        """

        statement = select(MFAChallenge).where(
            MFAChallenge.user_id == user_id,
            MFAChallenge.used_at.is_(None),
            MFAChallenge.revoked_at.is_(None),
            MFAChallenge.expires_at <= self._utcnow(),
        )

        challenges = list(
            self.db.execute(
                statement
            ).scalars().all()
        )

        if not challenges:
            return 0

        now = self._utcnow()

        for challenge in challenges:
            challenge.revoked_at = now
            self.db.add(challenge)

        self.db.flush()

        return len(challenges)