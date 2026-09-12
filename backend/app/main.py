import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes.system import router as system_router
from app.core.config import get_settings
from app.core.exceptions import EduSphereException
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIDMiddleware

configure_logging()

logger = logging.getLogger(__name__)
settings = get_settings()


app = FastAPI(
    title=f"{settings.app_name} API",
    description="Production-grade School Operating System API",
    version=settings.app_version,
)
app.add_middleware(RequestIDMiddleware)

@app.exception_handler(EduSphereException)
async def edusphere_exception_handler(
    request: Request,
    exc: EduSphereException,
) -> JSONResponse:
    logger.warning(
        "Application error | path=%s | code=%s | message=%s",
        request.url.path,
        exc.code,
        exc.message,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


@app.get("/", tags=["System"])
async def root():
    return {
        "application": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


app.include_router(
    system_router,
    prefix=settings.api_prefix,
)
