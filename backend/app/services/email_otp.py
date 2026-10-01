from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, RateLimitError
from app.models.email_otp import EmailOTP


settings = get_settings()


class EmailOTPService:
    """
    Service responsible for creating and verifying email OTPs.

    OTP values are never stored in plaintext.
    A keyed HMAC digest is stored instead.

    Security controls:
    - resend cooldown
    - rolling per-user OTP request rate limit
    - one active OTP per user/purpose
    - OTP expiration
    - maximum verification attempts
    - constant-time HMAC comparison
    """

    PURPOSE_MFA_LOGIN = "mfa_login"

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _generate_code() -> str:
        length = settings.email_otp_length
        minimum = 10 ** (length - 1)
        maximum = (10 ** length) - 1
        return str(secrets.randbelow(maximum - minimum + 1) + minimum)

    @staticmethod
    def _hash_code(code: str) -> str:
        return hmac.new(
            settings.secret_key.encode("utf-8"),
            code.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    def _get_latest_active_otp(
        self,
        user_id: int,
        purpose: str,
    ) -> EmailOTP | None:
        statement = (
            select(EmailOTP)
            .where(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.used_at.is_(None),
            )
            .order_by(
                EmailOTP.created_at.desc(),
                EmailOTP.id.desc(),
            )
            .limit(1)
        )
        return self.db.execute(statement).scalar_one_or_none()

    def _check_request_rate_limit(
        self,
        user_id: int,
        purpose: str,
        now: datetime,
    ) -> None:
        """Enforce the configured rolling OTP creation limit per user."""
        limit = settings.email_otp_rate_limit
        window_seconds = settings.email_otp_rate_window_seconds

        if limit <= 0 or window_seconds <= 0:
            return

        window_start = now - timedelta(seconds=window_seconds)

        statement = (
            select(func.count(EmailOTP.id))
            .where(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.created_at >= window_start,
            )
        )

        request_count = int(
            self.db.execute(statement).scalar_one() or 0
        )

        if request_count >= limit:
            raise RateLimitError(
                (
                    "Too many email OTP requests. "
                    "Please wait before requesting another code."
                ),
                code="EMAIL_OTP_RATE_LIMITED",
                details={
                    "retry_after_seconds": window_seconds,
                    "limit": limit,
                    "window_seconds": window_seconds,
                },
            )

    def create_otp(
        self,
        user_id: int,
        purpose: str = PURPOSE_MFA_LOGIN,
    ) -> tuple[EmailOTP, str]:
        """Create a new email OTP and return its plaintext code only to the caller."""
        now = self._utcnow()

        # Rolling request rate limit.
        self._check_request_rate_limit(
            user_id=user_id,
            purpose=purpose,
            now=now,
        )

        # Resend cooldown.
        latest = self._get_latest_active_otp(
            user_id=user_id,
            purpose=purpose,
        )

        if latest is not None:
            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            elapsed_seconds = (now - created_at).total_seconds()
            cooldown = settings.email_otp_resend_cooldown_seconds

            if elapsed_seconds < cooldown:
                remaining = max(1, int(cooldown - elapsed_seconds))
                raise RateLimitError(
                    (
                        "Please wait before requesting another "
                        f"email OTP. Try again in {remaining} seconds."
                    ),
                    code="EMAIL_OTP_RESEND_COOLDOWN",
                    details={"retry_after_seconds": remaining},
                )

        # Invalidate previous unused OTPs.
        statement = (
            select(EmailOTP)
            .where(
                EmailOTP.user_id == user_id,
                EmailOTP.purpose == purpose,
                EmailOTP.used_at.is_(None),
            )
        )

        for otp in self.db.execute(statement).scalars().all():
            otp.used_at = now

        # Generate and persist new OTP.
        code = self._generate_code()

        otp = EmailOTP(
            user_id=user_id,
            purpose=purpose,
            code_hash=self._hash_code(code),
            expires_at=now + timedelta(
                minutes=settings.email_otp_expire_minutes
            ),
            attempts=0,
            max_attempts=settings.email_otp_max_attempts,
        )

        self.db.add(otp)
        self.db.flush()

        return otp, code

    def verify_otp(
        self,
        user_id: int,
        code: str,
        purpose: str = PURPOSE_MFA_LOGIN,
    ) -> EmailOTP:
        """Verify the latest active email OTP."""
        normalized_code = str(code).strip()

        if (
            not normalized_code.isdigit()
            or len(normalized_code) != settings.email_otp_length
        ):
            raise BadRequestError(
                "Invalid email OTP.",
                code="INVALID_EMAIL_OTP",
            )

        otp = self._get_latest_active_otp(
            user_id=user_id,
            purpose=purpose,
        )

        if otp is None:
            raise BadRequestError(
                "No active email OTP was found.",
                code="EMAIL_OTP_NOT_FOUND",
            )

        now = self._utcnow()
        expires_at = otp.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now >= expires_at:
            otp.used_at = now
            self.db.flush()
            raise BadRequestError(
                "The email OTP has expired. Please request a new OTP.",
                code="EMAIL_OTP_EXPIRED",
            )

        if otp.attempts >= otp.max_attempts:
            otp.used_at = now
            self.db.flush()
            raise RateLimitError(
                "Maximum email OTP verification attempts exceeded.",
                code="EMAIL_OTP_MAX_ATTEMPTS",
            )

        otp.attempts += 1

        supplied_hash = self._hash_code(normalized_code)
        valid = hmac.compare_digest(supplied_hash, otp.code_hash)

        if not valid:
            if otp.attempts >= otp.max_attempts:
                otp.used_at = now

            self.db.flush()

            raise BadRequestError(
                "Invalid email OTP.",
                code="INVALID_EMAIL_OTP",
                details={
                    "attempts_remaining": max(
                        0,
                        otp.max_attempts - otp.attempts,
                    ),
                },
            )

        otp.used_at = now
        self.db.flush()
        return otp
