from __future__ import annotations

from typing import Any


class EduSphereException(Exception):
    """
    Base exception for the EduSphere application.
    """

    status_code: int = 500
    code: str = "APPLICATION_ERROR"

    def __init__(
        self,
        message: str = "An unexpected application error occurred.",
        *,
        code: str | None = None,
        details: Any = None,
    ):
        super().__init__(message)

        self.message = message
        self.code = code or self.code
        self.details = details


# Backward-compatible base name used by newer modules.
AppError = EduSphereException


class BadRequestError(EduSphereException):
    status_code = 400
    code = "BAD_REQUEST"


class UnauthorizedError(EduSphereException):
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(EduSphereException):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(EduSphereException):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(EduSphereException):
    status_code = 409
    code = "CONFLICT"


class ValidationError(EduSphereException):
    status_code = 422
    code = "VALIDATION_ERROR"


class RateLimitError(EduSphereException):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"