from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError


settings = get_settings()


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# ============================================================================
# PASSWORD
# ============================================================================


def hash_password(password: str) -> str:
    """
    Hash a user's password using bcrypt.
    """

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify a plain-text password against its stored hash.
    """

    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# ============================================================================
# ACCESS TOKEN
# ============================================================================


def create_access_token(
    user_id: str,
) -> tuple[str, datetime]:
    """
    Create a JWT access token.

    Returns:
        tuple[str, datetime]: encoded token and expiration time.
    """

    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": str(uuid4()),
        "typ": "access",
    }

    token = jwt.encode(
        payload,
        settings.secret_key,
        algorithm="HS256",
    )

    return token, expires_at


# ============================================================================
# MFA CHALLENGE TOKEN
# ============================================================================


def create_mfa_challenge_token(
    user_id: str,
) -> tuple[str, datetime]:
    """
    Create a short-lived JWT used only while completing MFA login.

    This token is NOT an access token and must never be accepted by
    the normal authentication dependency.

    The challenge token intentionally does not create a UserSession.
    A real session is created only after successful MFA verification.
    """

    now = datetime.now(timezone.utc)

    # MFA challenge should be short-lived.
    expires_at = now + timedelta(
        minutes=5
    )

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": str(uuid4()),
        "typ": "mfa_challenge",
    }

    token = jwt.encode(
        payload,
        settings.secret_key,
        algorithm="HS256",
    )

    return token, expires_at


def decode_mfa_challenge_token(
    token: str,
) -> dict:
    """
    Decode and validate an MFA challenge token.

    Only tokens explicitly marked as `mfa_challenge` are accepted.
    """

    try:
        claims = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except JWTError as exc:
        raise UnauthorizedError(
            "Invalid or expired MFA challenge.",
            code="INVALID_MFA_CHALLENGE",
        ) from exc

    if claims.get("typ") != "mfa_challenge":
        raise UnauthorizedError(
            "Invalid MFA challenge token type.",
            code="INVALID_MFA_CHALLENGE",
        )

    if not claims.get("sub"):
        raise UnauthorizedError(
            "MFA challenge is missing the user identifier.",
            code="INVALID_MFA_CHALLENGE",
        )

    if not claims.get("jti"):
        raise UnauthorizedError(
            "MFA challenge is missing the challenge identifier.",
            code="INVALID_MFA_CHALLENGE",
        )

    try:
        int(claims["sub"])
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError(
            "MFA challenge contains an invalid user identifier.",
            code="INVALID_MFA_CHALLENGE",
        ) from exc

    return claims


# ============================================================================
# ACCESS TOKEN DECODING
# ============================================================================


def decode_access_token_claims(
    token: str,
) -> dict:
    """
    Decode and validate a JWT access token.
    """

    try:
        claims = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except JWTError as exc:
        raise UnauthorizedError(
            "Invalid or expired authentication token.",
            code="INVALID_TOKEN",
        ) from exc

    # MFA challenge tokens must never be accepted as access tokens.
    if claims.get("typ") != "access":
        raise UnauthorizedError(
            "Invalid authentication token type.",
            code="INVALID_TOKEN",
        )

    if not claims.get("sub"):
        raise UnauthorizedError(
            "Authentication token is missing the user identifier.",
            code="INVALID_TOKEN",
        )

    if not claims.get("jti"):
        raise UnauthorizedError(
            "Authentication token is missing the session identifier.",
            code="INVALID_TOKEN",
        )

    return claims


def decode_access_token(
    token: str,
) -> int:
    """
    Backward-compatible helper that returns the authenticated user ID.
    """

    claims = decode_access_token_claims(token)

    try:
        return int(claims["sub"])
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError(
            "Authentication token contains an invalid user identifier.",
            code="INVALID_TOKEN",
        ) from exc