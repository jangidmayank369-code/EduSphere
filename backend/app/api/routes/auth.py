from __future__ import annotations

import threading
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    UnauthorizedError,
)
from app.core.security import (
    create_access_token,
    create_mfa_challenge_token,
    decode_access_token_claims,
    decode_mfa_challenge_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.schemas.mfa import (
    MFADisableRequest,
    MFADisableResponse,
    MFAEnableRequest,
    MFAEnableResponse,
    MFARecoveryCodesRegenerateRequest,
    MFARecoveryCodesRegenerateResponse,
    MFASetupResponse,
    MFAStatusResponse,
    MFALoginVerifyRequest,
)
from app.services.audit import AuditService
from app.services.email import EmailService
from app.services.email_otp import EmailOTPService
from app.services.mfa import MFAService
from app.services.mfa_challenge import MFAChallengeService
from app.services.session import SessionService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


settings = get_settings()


# Per-process IP limiter for email OTP issuance. The database-backed
# per-user limiter remains in EmailOTPService; this second layer prevents
# one public IP from repeatedly requesting OTPs for many accounts.
_email_otp_ip_lock = threading.Lock()
_email_otp_ip_requests: dict[str, list[float]] = {}


def _check_email_otp_ip_rate_limit(request: Request) -> None:
    limit = settings.email_otp_rate_limit
    window_seconds = settings.email_otp_rate_window_seconds

    if limit <= 0 or window_seconds <= 0:
        return

    client_ip = _get_client_ip(request)
    if not client_ip:
        return

    now = time.monotonic()
    cutoff = now - window_seconds

    with _email_otp_ip_lock:
        timestamps = _email_otp_ip_requests.get(client_ip, [])
        timestamps = [timestamp for timestamp in timestamps if timestamp > cutoff]

        if len(timestamps) >= limit:
            retry_after = max(1, int(window_seconds - (now - timestamps[0])))
            _email_otp_ip_requests[client_ip] = timestamps
            raise RateLimitError(
                (
                    "Too many email OTP requests from this network. "
                    "Please wait before requesting another code."
                ),
                code="EMAIL_OTP_IP_RATE_LIMITED",
                details={
                    "retry_after_seconds": retry_after,
                    "limit": limit,
                    "window_seconds": window_seconds,
                },
            )

        timestamps.append(now)
        _email_otp_ip_requests[client_ip] = timestamps


# ============================================================
# HELPERS
# ============================================================


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client:
        return request.client.host

    return None


def _get_mfa_service(db: Session) -> MFAService:
    return MFAService(
        db=db,
        encryption_key=settings.secret_key,
    )


def _authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise UnauthorizedError(
            "Invalid email or password.",
            code="INVALID_CREDENTIALS",
        )

    if not verify_password(
        password,
        user.password_hash,
    ):
        raise UnauthorizedError(
            "Invalid email or password.",
            code="INVALID_CREDENTIALS",
        )

    if not user.is_active:
        raise ForbiddenError(
            "Your account is inactive.",
            code="USER_INACTIVE",
        )

    return user


def _create_authenticated_session(
    user: User,
    request: Request,
    db: Session,
) -> TokenResponse:
    access_token, expires_at = create_access_token(
        user.id,
    )

    claims = decode_access_token_claims(
        access_token,
    )

    jti = claims["jti"]

    SessionService(db).create(
        user_id=user.id,
        jti=jti,
        expires_at=expires_at,
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get(
            "user-agent",
        ),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_at=expires_at,
        mfa_required=False,
        mfa_challenge_token=None,
    )


def _get_user_roles(user: User) -> list[str]:
    return sorted(
        {
            role.name
            for role in user.roles
            if role.name
        }
    )


def _get_user_permissions(user: User) -> list[str]:
    permissions: set[str] = set()

    for role in user.roles:
        for permission in role.permissions:
            if permission.code:
                permissions.add(permission.code)

    return sorted(permissions)


def _get_mfa_challenge_user(
    db: Session,
    challenge_token: str,
    *,
    for_update: bool = False,
) -> tuple[dict, User]:
    """
    Validate an MFA challenge JWT and its persistent DB record.

    The JWT proves possession of a valid short-lived challenge token.
    The database record additionally enforces:
    - challenge existence
    - user binding
    - expiry
    - revocation
    - single-use state
    - maximum verification attempts
    """

    claims = decode_mfa_challenge_token(
        challenge_token,
    )

    user_id = int(claims["sub"])
    challenge_jti = str(claims["jti"])

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise NotFoundError(
            "User not found.",
            code="USER_NOT_FOUND",
        )

    if not user.is_active:
        raise ForbiddenError(
            "Your account is inactive.",
            code="USER_INACTIVE",
        )

    mfa_status = _get_mfa_service(db).status(
        user.id,
    )

    if not mfa_status["enabled"]:
        raise BadRequestError(
            "MFA is not enabled for this account.",
            code="MFA_NOT_ENABLED",
        )

    MFAChallengeService(db).validate(
        user_id=user.id,
        jti=challenge_jti,
        for_update=for_update,
    )

    return claims, user


# ============================================================
# LOGIN
# ============================================================


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = _authenticate_user(
        db=db,
        email=payload.email,
        password=payload.password,
    )

    mfa_service = _get_mfa_service(db)

    mfa_status = mfa_service.status(
        user.id,
    )

    if mfa_status["enabled"]:
        challenge_token, expires_at = (
            create_mfa_challenge_token(
                user.id,
            )
        )

        challenge_claims = decode_mfa_challenge_token(
            challenge_token,
        )

        challenge_service = MFAChallengeService(db)

        challenge_service.create(
            user_id=user.id,
            jti=str(challenge_claims["jti"]),
            expires_at=expires_at,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )

        db.commit()

        return TokenResponse(
            access_token=None,
            token_type="bearer",
            expires_at=expires_at,
            mfa_required=True,
            mfa_challenge_token=challenge_token,
        )

    token_response = (
        _create_authenticated_session(
            user=user,
            request=request,
            db=db,
        )
    )

    AuditService(db).create(
        actor_user_id=user.id,
        action="AUTH_LOGIN",
        resource_type="User",
        resource_id=str(user.id),
        details={
            "mfa_required": False,
            "ip_address": _get_client_ip(request),
        },
    )

    db.commit()

    return token_response


# ============================================================
# EMAIL OTP — SEND
# ============================================================


@router.post(
    "/mfa/send-email-otp",
)
def send_email_otp(
    challenge_token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Generate and send a one-time email OTP for MFA login.

    The challenge token proves that the user has already passed
    the password authentication stage.
    """

    _, user = _get_mfa_challenge_user(
        db=db,
        challenge_token=challenge_token,
    )

    _check_email_otp_ip_rate_limit(request)

    email_otp_service = EmailOTPService(db)

    otp, code = email_otp_service.create_otp(
        user_id=user.id,
        purpose=EmailOTPService.PURPOSE_MFA_LOGIN,
    )

    try:
        EmailService.send_mfa_email_otp(
            recipient=user.email,
            otp_code=code,
            expires_in_minutes=(
                settings.email_otp_expire_minutes
            ),
        )
    except Exception:
        # Do not leave a usable OTP in the database when
        # email delivery fails.
        otp.used_at = email_otp_service._utcnow()
        db.commit()
        raise

    AuditService(db).create(
        actor_user_id=user.id,
        action="MFA_EMAIL_OTP_SEND",
        resource_type="User",
        resource_id=str(user.id),
        details={
            "mfa_method": "email_otp",
            "ip_address": _get_client_ip(request),
        },
    )

    db.commit()

    return {
        "message": (
            "A verification code has been sent "
            "to your registered email address."
        ),
        "expires_in_minutes": (
            settings.email_otp_expire_minutes
        ),
        "cooldown_seconds": (
            settings.email_otp_resend_cooldown_seconds
        ),
    }


# ============================================================
# MFA LOGIN VERIFICATION
# ============================================================


@router.post(
    "/mfa/verify-login",
    response_model=TokenResponse,
)
def verify_mfa_login(
    payload: MFALoginVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    # Lock the persistent challenge row for the entire verification
    # transaction. This prevents two concurrent requests from consuming
    # the same MFA challenge successfully.
    claims, user = _get_mfa_challenge_user(
        db=db,
        challenge_token=payload.challenge_token,
        for_update=True,
    )

    challenge_service = MFAChallengeService(db)

    challenge = challenge_service.validate(
        user_id=user.id,
        jti=str(claims["jti"]),
        for_update=True,
    )

    has_otp = bool(payload.otp_code)

    has_recovery_code = bool(
        payload.recovery_code
    )

    has_email_otp = bool(
        payload.email_otp_code
    )

    supplied_methods = sum(
        [
            has_otp,
            has_recovery_code,
            has_email_otp,
        ]
    )

    if supplied_methods != 1:
        raise BadRequestError(
            (
                "Provide exactly one of Authenticator OTP, "
                "recovery code, or email OTP."
            ),
            code="MFA_VERIFICATION_INPUT_INVALID",
        )

    mfa_service = _get_mfa_service(db)

    if has_otp:
        verified = mfa_service.verify_totp(
            user_id=user.id,
            otp_code=payload.otp_code,
        )

        if not verified:
            challenge_service.register_failed_attempt(
                challenge,
            )
            db.commit()

            raise UnauthorizedError(
                "Invalid MFA verification code.",
                code="INVALID_MFA_CODE",
            )

        mfa_method = "otp"

    elif has_recovery_code:
        verified = mfa_service.consume_recovery_code(
            user_id=user.id,
            recovery_code=payload.recovery_code,
        )

        if not verified:
            challenge_service.register_failed_attempt(
                challenge,
            )
            db.commit()

            raise UnauthorizedError(
                "Invalid or already used recovery code.",
                code="INVALID_RECOVERY_CODE",
            )

        mfa_method = "recovery_code"

    else:
        try:
            EmailOTPService(db).verify_otp(
                user_id=user.id,
                code=payload.email_otp_code,
                purpose=EmailOTPService.PURPOSE_MFA_LOGIN,
            )
        except Exception:
            challenge_service.register_failed_attempt(
                challenge,
            )
            db.commit()
            raise

        mfa_method = "email_otp"

    # --------------------------------------------------------
    # MFA successful — permanently consume the challenge
    # before creating the authenticated session.
    # --------------------------------------------------------

    challenge_service.consume(
        challenge,
    )

    # --------------------------------------------------------
    # MFA successful — create real authenticated session
    # --------------------------------------------------------

    token_response = (
        _create_authenticated_session(
            user=user,
            request=request,
            db=db,
        )
    )

    AuditService(db).create(
        actor_user_id=user.id,
        action="AUTH_LOGIN",
        resource_type="User",
        resource_id=str(user.id),
        details={
            "mfa_required": True,
            "mfa_method": mfa_method,
            "mfa_challenge_jti": claims.get("jti"),
            "ip_address": _get_client_ip(request),
        },
    )

    db.commit()

    return token_response


# ============================================================
# CURRENT USER
# ============================================================


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def get_me(
    current_user: User = Depends(
        get_current_user,
    ),
) -> CurrentUserResponse:
    roles = _get_user_roles(
        current_user,
    )

    permissions = _get_user_permissions(
        current_user,
    )

    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        roles=roles,
        permissions=permissions,
    )


# ============================================================
# MFA MANAGEMENT
# ============================================================


@router.get(
    "/mfa/status",
    response_model=MFAStatusResponse,
)
def get_mfa_status(
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
) -> MFAStatusResponse:
    status = _get_mfa_service(db).status(
        current_user.id,
    )

    return MFAStatusResponse(
        configured=status["configured"],
        enabled=status["enabled"],
        enabled_at=status["enabled_at"],
        last_verified_at=status[
            "last_verified_at"
        ],
        remaining_recovery_codes=status[
            "remaining_recovery_codes"
        ],
    )


@router.post(
    "/mfa/setup",
)
def setup_mfa(
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
) -> MFASetupResponse:
    result = _get_mfa_service(db).setup(
        current_user,
    )

    db.commit()

    return MFASetupResponse(
        **result,
    )


@router.post(
    "/mfa/enable",
    response_model=MFAEnableResponse,
)
def enable_mfa(
    payload: MFAEnableRequest,
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
) -> MFAEnableResponse:
    mfa_service = _get_mfa_service(db)

    status = mfa_service.status(
        current_user.id,
    )

    if status["enabled"]:
        raise ConflictError(
            "MFA is already enabled.",
            code="MFA_ALREADY_ENABLED",
        )

    recovery_codes = mfa_service.enable(
        user=current_user,
        otp_code=payload.otp_code,
    )

    AuditService(db).create(
        actor_user_id=current_user.id,
        action="MFA_ENABLE",
        resource_type="User",
        resource_id=str(current_user.id),
        details={},
    )

    db.commit()

    return MFAEnableResponse(
        enabled=True,
        recovery_codes=recovery_codes,
    )


@router.post(
    "/mfa/disable",
    response_model=MFADisableResponse,
)
def disable_mfa(
    payload: MFADisableRequest,
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
) -> MFADisableResponse:
    mfa_service = _get_mfa_service(db)

    status = mfa_service.status(
        current_user.id,
    )

    if not status["enabled"]:
        raise BadRequestError(
            "MFA is not enabled.",
            code="MFA_NOT_ENABLED",
        )

    mfa_service.disable(
        user=current_user,
        password=payload.password,
        otp_code=payload.otp_code,
        recovery_code=payload.recovery_code,
    )

    AuditService(db).create(
        actor_user_id=current_user.id,
        action="MFA_DISABLE",
        resource_type="User",
        resource_id=str(current_user.id),
        details={},
    )

    db.commit()

    return MFADisableResponse(
        enabled=False,
    )


@router.post(
    "/mfa/recovery-codes/regenerate",
    response_model=MFARecoveryCodesRegenerateResponse,
)
def regenerate_mfa_recovery_codes(
    payload: MFARecoveryCodesRegenerateRequest,
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
) -> MFARecoveryCodesRegenerateResponse:
    mfa_service = _get_mfa_service(db)

    status = mfa_service.status(
        current_user.id,
    )

    if not status["enabled"]:
        raise BadRequestError(
            "MFA is not enabled.",
            code="MFA_NOT_ENABLED",
        )

    recovery_codes = (
        mfa_service.regenerate_recovery_codes(
            user=current_user,
            otp_code=payload.otp_code,
        )
    )

    AuditService(db).create(
        actor_user_id=current_user.id,
        action="MFA_RECOVERY_CODES_REGENERATE",
        resource_type="User",
        resource_id=str(current_user.id),
        details={},
    )

    db.commit()

    return MFARecoveryCodesRegenerateResponse(
        recovery_codes=recovery_codes,
        remaining_recovery_codes=len(
            recovery_codes,
        ),
    )


# ============================================================
# SESSIONS
# ============================================================


@router.get(
    "/sessions",
)
def get_sessions(
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
):
    return SessionService(db).list_for_user(
        current_user.id,
    )


@router.post(
    "/logout",
)
def logout(
    request: Request,
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
):
    authorization = request.headers.get(
        "authorization",
        "",
    )

    if not authorization.lower().startswith(
        "bearer "
    ):
        raise UnauthorizedError(
            "Authentication token is required.",
            code="INVALID_TOKEN",
        )

    token = authorization.split(
        " ",
        1,
    )[1].strip()

    claims = decode_access_token_claims(
        token,
    )

    jti = claims["jti"]

    SessionService(db).revoke_by_jti(
        jti,
    )

    AuditService(db).create(
        actor_user_id=current_user.id,
        action="AUTH_LOGOUT",
        resource_type="User",
        resource_id=str(current_user.id),
        details={},
    )

    db.commit()

    return {
        "message": "Logged out successfully.",
    }


@router.post(
    "/logout-all",
)
def logout_all(
    current_user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(get_db),
):
    revoked_count = (
        SessionService(db).revoke_all_for_user(
            current_user.id,
        )
    )

    AuditService(db).create(
        actor_user_id=current_user.id,
        action="AUTH_LOGOUT_ALL",
        resource_type="User",
        resource_id=str(current_user.id),
        details={
            "revoked_count": revoked_count,
        },
    )

    db.commit()

    return {
        "message": "All active sessions have been revoked.",
        "revoked_count": revoked_count,
    }