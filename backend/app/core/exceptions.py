from typing import Any


class EduSphereException(Exception):
    """Base exception for all expected EduSphere application errors."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "APPLICATION_ERROR",
        status_code: int = 400,
        details: Any | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

        super().__init__(message)


class NotFoundError(EduSphereException):
    """Raised when a requested resource does not exist."""

    def __init__(
        self,
        message: str = "Resource not found.",
        *,
        code: str = "NOT_FOUND",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            code=code,
            status_code=404,
            details=details,
        )


class ConflictError(EduSphereException):
    """Raised when an operation conflicts with existing data/state."""

    def __init__(
        self,
        message: str = "Resource conflict.",
        *,
        code: str = "CONFLICT",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            code=code,
            status_code=409,
            details=details,
        )


class ForbiddenError(EduSphereException):
    """Raised when an authenticated user lacks permission."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        *,
        code: str = "FORBIDDEN",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message,
            code=code,
            status_code=403,
            details=details,
        )