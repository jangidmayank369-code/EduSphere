from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================
# MFA STATUS
# ============================================================

class MFAStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    configured: bool
    enabled: bool
    enabled_at: datetime | None = None
    last_verified_at: datetime | None = None
    remaining_recovery_codes: int = 0


# ============================================================
# MFA SETUP
# ============================================================

class MFASetupResponse(BaseModel):
    """
    Data required by the frontend to configure an authenticator app.

    qr_code is returned as an SVG data URL so the browser can render
    the QR directly without requiring a separate image endpoint.
    """

    secret: str
    provisioning_uri: str
    issuer: str
    account_name: str
    digits: int = 6
    period: int = 30
    algorithm: str = "SHA1"
    qr_code: str | None = None


# ============================================================
# MFA ENABLE
# ============================================================

class MFAEnableRequest(BaseModel):
    otp_code: str = Field(min_length=6, max_length=6)

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise ValueError("OTP code must be exactly 6 digits.")

        return value


class MFAEnableResponse(BaseModel):
    enabled: bool
    recovery_codes: list[str]


# ============================================================
# MFA LOGIN VERIFICATION
# ============================================================

class MFALoginVerifyRequest(BaseModel):
    challenge_token: str = Field(min_length=1)

    otp_code: str | None = None
    recovery_code: str | None = None
    email_otp_code: str | None = None

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise ValueError("Authenticator code must be exactly 6 digits.")

        return value

    @field_validator("email_otp_code")
    @classmethod
    def validate_email_otp_code(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise ValueError("Email OTP must be exactly 6 digits.")

        return value

    @field_validator("recovery_code")
    @classmethod
    def normalize_recovery_code(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().upper().replace(" ", "")

        if not value:
            raise ValueError("Recovery code cannot be empty.")

        return value


# ============================================================
# MFA DISABLE
# ============================================================

class MFADisableRequest(BaseModel):
    password: str = Field(min_length=1)
    otp_code: str | None = None
    recovery_code: str | None = None

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise ValueError("OTP code must be exactly 6 digits.")

        return value

    @field_validator("recovery_code")
    @classmethod
    def normalize_recovery_code(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip().upper().replace(" ", "")

        if not value:
            raise ValueError("Recovery code cannot be empty.")

        return value


class MFADisableResponse(BaseModel):
    enabled: bool
    message: str = "MFA disabled successfully."


# ============================================================
# RECOVERY CODES
# ============================================================

class MFARecoveryCodesRegenerateRequest(BaseModel):
    otp_code: str = Field(min_length=6, max_length=6)

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        value = value.strip()

        if not value.isdigit() or len(value) != 6:
            raise ValueError("OTP code must be exactly 6 digits.")

        return value


class MFARecoveryCodesRegenerateResponse(BaseModel):
    recovery_codes: list[str]
