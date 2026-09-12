import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


REQUEST_ID_HEADER = "X-Request-ID"

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a correlation ID to every HTTP request."""

    async def dispatch(
        self,
        request: Request,
        call_next,
    ) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER)

        if not request_id:
            request_id = str(uuid.uuid4())

        request.state.request_id = request_id

        logger.info(
            "Request started | method=%s | path=%s",
            request.method,
            request.url.path,
            extra={"request_id": request_id},
        )

        response = await call_next(request)

        response.headers[REQUEST_ID_HEADER] = request_id

        logger.info(
            "Request completed | method=%s | path=%s | status=%s",
            request.method,
            request.url.path,
            response.status_code,
            extra={"request_id": request_id},
        )

        return response