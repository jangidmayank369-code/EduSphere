from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any

import pyotp
import qrcode
from qrcode.image.svg import SvgImage
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError
from app.core.security import hash_password, verify_password
from app.models.mfa import UserMFA
from app.models.user import User


class MFAService:
    """
    Handles all MFA-related business logic.

    Security model:
    - TOTP secret is encrypted at rest.
    - Recovery codes are stored only as password hashes.
    - Recovery codes are single-use.
    - TOTP verification uses pyotp.
    """

    RECOVERY_CODE_COUNT = 10
    RECOVERY_CODE_LENGTH = 10

    def __init__(self, db: Session, encryption_key: str):
        self.db = db
        self.fernet = self._build_fernet(encryption_key)

    # ------------------------------------------------------------------
    # Encryption
    # ------------------------------------------------------------------

    @staticmethod
    def _build_fernet(encryption_key: str) -> Fernet:
        """
        Build a Fernet instance from the application encryption key.

        The configured key can either already be a valid Fernet key or,
        for convenience, any sufficiently long application secret can be
        deterministically converted into a valid Fernet key.
        """
        key = encryption_key.strip()

        if not key:
            raise ValueError("MFA encryption key cannot be empty.")

        try:
            decoded = base64.urlsafe_b64decode(key.encode("utf-8"))

            if len(decoded) == 32:
                return Fernet(key.encode("utf-8"))
        except Exception:
            pass

        derived_key = base64.urlsafe_b64encode(
            hashlib.sha256(key.encode("utf-8")).digest()
        )

        return Fernet(derived_key)

    def _encrypt_secret(self, secret: str) -> str:
        return self.fernet.encrypt(
            secret.encode("utf-8")
        ).decode("utf-8")

    def _decrypt_secret(self, encrypted_secret: str) -> str:
        try:
            return self.fernet.decrypt(
                encrypted_secret.encode("utf-8")
            ).decode("utf-8")
        except InvalidToken as exc:
            raise BadRequestError(
                "Unable to decrypt the MFA secret.",
                code="MFA_SECRET_INVALID",
            ) from exc

    # ------------------------------------------------------------------
    # MFA record
    # ------------------------------------------------------------------

    def get_mfa(self, user_id: int) -> UserMFA | None:
        return (
            self.db.query(UserMFA)
            .filter(UserMFA.user_id == user_id)
            .first()
        )

    def get_or_create_mfa(self, user_id: int) -> UserMFA:
        mfa = self.get_mfa(user_id)

        if mfa:
            return mfa

        mfa = UserMFA(
            user_id=user_id,
            secret_encrypted=self._encrypt_secret(
                pyotp.random_base32()
            ),
            is_enabled=False,
            recovery_code_hashes=[],
        )

        self.db.add(mfa)
        self.db.flush()

        return mfa

    # ------------------------------------------------------------------
    # TOTP setup
    # ------------------------------------------------------------------

    def setup(self, user: User) -> dict[str, Any]:
        """
        Create or reuse an MFA setup secret.

        This does NOT enable MFA.

        MFA becomes active only after the user successfully verifies
        an OTP through enable().
        """
        mfa = self.get_mfa(user.id)

        if mfa and mfa.is_enabled:
            raise BadRequestError(
                "MFA is already enabled for this account.",
                code="MFA_ALREADY_ENABLED",
            )

        if mfa:
            secret = self._decrypt_secret(
                mfa.secret_encrypted
            )
        else:
            secret = pyotp.random_base32()

            mfa = UserMFA(
                user_id=user.id,
                secret_encrypted=self._encrypt_secret(secret),
                is_enabled=False,
                recovery_code_hashes=[],
            )

            self.db.add(mfa)
            self.db.flush()

        issuer = "EduSphere"
        account_name = user.email.strip().lower()

        totp = pyotp.TOTP(secret)

        provisioning_uri = totp.provisioning_uri(
            name=account_name,
            issuer_name=issuer,
        )

        # Generate the QR locally. The provisioning URI contains the
        # MFA secret, so it must never be sent to a third-party QR service.
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        svg_image = qr.make_image(image_factory=SvgImage)
        svg_markup = svg_image.to_string()

        if isinstance(svg_markup, bytes):
            svg_markup = svg_markup.decode("utf-8")

        qr_code_data_url = (
            "data:image/svg+xml;base64,"
            + base64.b64encode(
                svg_markup.encode("utf-8")
            ).decode("ascii")
        )

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "qr_code": qr_code_data_url,
            "issuer": issuer,
            "account_name": account_name,
            "digits": totp.digits,
            "period": totp.interval,
            "algorithm": "SHA1",
        }

    # ------------------------------------------------------------------
    # TOTP verification
    # ------------------------------------------------------------------

    def verify_totp(
        self,
        user_id: int,
        otp_code: str,
    ) -> bool:
        mfa = self.get_mfa(user_id)

        if not mfa:
            return False

        if not mfa.secret_encrypted:
            return False

        try:
            secret = self._decrypt_secret(
                mfa.secret_encrypted
            )
        except BadRequestError:
            return False

        normalized_code = self._normalize_otp(otp_code)

        if not normalized_code:
            return False

        totp = pyotp.TOTP(secret)

        return bool(
            totp.verify(
                normalized_code,
                valid_window=1,
            )
        )

    @staticmethod
    def _normalize_otp(otp_code: str | None) -> str:
        if not otp_code:
            return ""

        return "".join(
            character
            for character in otp_code.strip()
            if character.isdigit()
        )

    # ------------------------------------------------------------------
    # Enable MFA
    # ------------------------------------------------------------------

    def enable(
        self,
        user: User,
        otp_code: str,
    ) -> list[str]:
        """
        Verify the initial OTP and enable MFA.

        Returns newly generated recovery codes.

        Recovery codes are returned only during this operation because
        only their hashes are persisted.
        """
        mfa = self.get_mfa(user.id)

        if not mfa:
            raise BadRequestError(
                "MFA setup has not been started.",
                code="MFA_SETUP_REQUIRED",
            )

        if mfa.is_enabled:
            raise BadRequestError(
                "MFA is already enabled.",
                code="MFA_ALREADY_ENABLED",
            )

        if not self.verify_totp(
            user.id,
            otp_code,
        ):
            raise BadRequestError(
                "Invalid authentication code.",
                code="MFA_INVALID_CODE",
            )

        recovery_codes = self.generate_recovery_codes()

        mfa.recovery_code_hashes = [
            hash_password(code)
            for code in recovery_codes
        ]

        mfa.is_enabled = True
        mfa.enabled_at = datetime.now(timezone.utc)
        mfa.last_verified_at = datetime.now(timezone.utc)

        self.db.add(mfa)
        self.db.flush()

        return recovery_codes

    # ------------------------------------------------------------------
    # Disable MFA
    # ------------------------------------------------------------------

    def disable(
        self,
        user: User,
        *,
        password: str,
        otp_code: str | None = None,
        recovery_code: str | None = None,
    ) -> None:
        """
        Disable MFA after validating the account password and one
        valid MFA factor.
        """
        mfa = self.get_mfa(user.id)

        if not mfa or not mfa.is_enabled:
            raise BadRequestError(
                "MFA is not enabled.",
                code="MFA_NOT_ENABLED",
            )

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise BadRequestError(
                "Invalid password.",
                code="INVALID_PASSWORD",
            )

        verified = False

        if otp_code:
            verified = self.verify_totp(
                user.id,
                otp_code,
            )

            if verified:
                mfa.last_verified_at = datetime.now(
                    timezone.utc
                )

        if not verified and recovery_code:
            verified = self.consume_recovery_code(
                user.id,
                recovery_code,
            )

        if not verified:
            raise BadRequestError(
                "A valid MFA code or recovery code is required.",
                code="MFA_VERIFICATION_REQUIRED",
            )

        mfa.is_enabled = False
        mfa.enabled_at = None
        mfa.last_verified_at = datetime.now(
            timezone.utc
        )

        self.db.add(mfa)
        self.db.flush()

    # ------------------------------------------------------------------
    # Recovery codes
    # ------------------------------------------------------------------

    @classmethod
    def generate_recovery_codes(cls) -> list[str]:
        return [
            cls._generate_recovery_code()
            for _ in range(cls.RECOVERY_CODE_COUNT)
        ]

    @classmethod
    def _generate_recovery_code(cls) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

        raw = "".join(
            secrets.choice(alphabet)
            for _ in range(cls.RECOVERY_CODE_LENGTH)
        )

        # Easier to read and manually type.
        return f"{raw[:5]}-{raw[5:]}"

    def consume_recovery_code(
        self,
        user_id: int,
        recovery_code: str,
    ) -> bool:
        """
        Validate and consume exactly one recovery code.

        Returns:
            True  -> valid code consumed
            False -> invalid/already-used code
        """
        mfa = self.get_mfa(user_id)

        if not mfa or not mfa.is_enabled:
            return False

        stored_hashes = list(
            mfa.recovery_code_hashes or []
        )

        if not stored_hashes:
            return False

        normalized_code = (
            recovery_code
            .strip()
            .upper()
            .replace(" ", "")
        )

        if not normalized_code:
            return False

        matched_index: int | None = None

        for index, code_hash in enumerate(stored_hashes):
            try:
                if verify_password(
                    normalized_code,
                    code_hash,
                ):
                    matched_index = index
                    break
            except Exception:
                continue

        if matched_index is None:
            return False

        # Remove the consumed recovery code permanently.
        stored_hashes.pop(matched_index)

        mfa.recovery_code_hashes = stored_hashes
        mfa.last_verified_at = datetime.now(
            timezone.utc
        )

        self.db.add(mfa)
        self.db.flush()

        return True

    def regenerate_recovery_codes(
        self,
        user: User,
        *,
        otp_code: str,
    ) -> list[str]:
        """Replace all existing recovery codes after successful TOTP verification."""
        mfa = self.get_mfa(user.id)
        if not mfa or not mfa.is_enabled:
            raise BadRequestError("MFA is not enabled.", code="MFA_NOT_ENABLED")

        normalized_code = self._normalize_otp(otp_code)
        if len(normalized_code) != 6 or not normalized_code.isdigit():
            raise BadRequestError("Enter the current 6-digit authenticator code.", code="MFA_INVALID_CODE")
        if not mfa.secret_encrypted:
            raise BadRequestError("MFA authenticator is not configured correctly.", code="MFA_CONFIGURATION_INVALID")

        try:
            secret = self._decrypt_secret(mfa.secret_encrypted)
            totp = pyotp.TOTP(secret, digits=6, interval=30)
            verified = bool(totp.verify(normalized_code, valid_window=1))
        except (ValueError, TypeError):
            verified = False

        if not verified:
            raise BadRequestError("Invalid authentication code.", code="MFA_INVALID_CODE")

        recovery_codes = self.generate_recovery_codes()
        mfa.recovery_code_hashes = [hash_password(code) for code in recovery_codes]
        mfa.last_verified_at = datetime.now(timezone.utc)
        self.db.add(mfa)
        self.db.flush()
        return recovery_codes

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    def status(self, user_id: int) -> dict[str, Any]:
        mfa = self.get_mfa(user_id)

        if not mfa:
            return {
                "configured": False,
                "enabled": False,
                "enabled_at": None,
                "last_verified_at": None,
                "remaining_recovery_codes": 0,
            }

        return {
            "configured": True,
            "enabled": bool(mfa.is_enabled),
            "enabled_at": mfa.enabled_at,
            "last_verified_at": mfa.last_verified_at,
            "remaining_recovery_codes": len(
                mfa.recovery_code_hashes or []
            ),
        }