from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================
    # Application
    # =========================

    app_name: str = "EduSphere"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    debug: bool = False

    # =========================
    # Database
    # =========================

    database_url: str

    # =========================
    # Security / JWT
    # =========================

    secret_key: str = Field(
        min_length=32,
    )

    access_token_expire_minutes: int = Field(
        default=60,
        ge=5,
        le=1440,
    )

    jwt_issuer: str = "edusphere"

    jwt_audience: str = "edusphere-api"

    # =========================
    # CORS
    # =========================

    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # =========================
    # Login Rate Limiting
    # =========================

    login_rate_limit: int = Field(
        default=10,
        ge=1,
        le=100,
    )

    login_rate_window_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
    )

    # =========================
    # MFA Rate Limiting
    # =========================

    mfa_rate_limit: int = Field(
        default=5,
        ge=1,
        le=50,
    )

    mfa_rate_window_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
    )

    # =========================
    # Email / SMTP
    # =========================

    smtp_enabled: bool = False

    smtp_host: str = ""

    # Gmail SMTP SSL
    # Port 465 is reachable on the current network.
    smtp_port: int = Field(
        default=465,
        ge=1,
        le=65535,
    )

    smtp_username: str = ""

    smtp_password: str = ""

    # Port 465 uses implicit SSL.
    smtp_use_tls: bool = False
    smtp_use_ssl: bool = True

    smtp_from_email: str = ""

    smtp_from_name: str = "EduSphere"

    # =========================
    # Email OTP
    # =========================

    email_otp_expire_minutes: int = Field(
        default=5,
        ge=1,
        le=15,
    )

    email_otp_length: int = Field(
        default=6,
        ge=6,
        le=8,
    )

    email_otp_max_attempts: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    email_otp_resend_cooldown_seconds: int = Field(
        default=60,
        ge=30,
        le=300,
    )

    email_otp_rate_limit: int = Field(
        default=3,
        ge=1,
        le=10,
    )

    email_otp_rate_window_seconds: int = Field(
        default=900,
        ge=60,
        le=3600,
    )

    # =========================
    # Pydantic Settings
    # =========================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if len(value) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long."
            )

        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Shared settings instance.
# This is used throughout the application as:
# from app.core.config import settings
settings = get_settings()