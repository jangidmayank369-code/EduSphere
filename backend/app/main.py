import logging
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.admissions import router as admissions_router
from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.fee_structures import router as fee_structures_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.parents import router as parents_router
from app.api.routes.rbac import router as rbac_router
from app.api.routes.school import router as school_router
from app.api.routes.student_fee_plans import router as student_fee_plans_router
from app.api.routes.students import router as students_router
from app.api.routes.system import router as system_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.exceptions import EduSphereException
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIDMiddleware


configure_logging()

logger = logging.getLogger(__name__)
settings = get_settings()


app = FastAPI(
    title=f"{settings.app_name} API",
    description="EduSphere — Production-grade School Operating System API.",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Local development
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Current Vercel production/preview deployment URLs.
#
# Vercel creates a different preview URL for deployments, for example:
# https://edusphere-qcsm50kdy-edu-sphere4.vercel.app
#
# The regex allows only EduSphere's Vercel deployment naming pattern,
# instead of allowing every arbitrary vercel.app application.
allowed_origin_regex = (
    r"^https://edusphere-[a-z0-9-]+-edu-sphere4\.vercel\.app$"
)

# Existing production alias, if used.
allowed_origins.append(
    "https://edusphere-eight-sooty.vercel.app"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestIDMiddleware)


# ---------------------------------------------------------------------------
# EduSphere application exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(EduSphereException)
async def edusphere_exception_handler(
    request: Request,
    exc: EduSphereException,
) -> JSONResponse:

    request_id = getattr(
        request.state,
        "request_id",
        "-",
    )

    logger.warning(
        "Application error | method=%s | path=%s | code=%s | message=%s",
        request.method,
        request.url.path,
        exc.code,
        exc.message,
        extra={"request_id": request_id},
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
        headers={
            "X-Request-ID": request_id,
        },
    )


# ---------------------------------------------------------------------------
# Unexpected exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unexpected_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:

    request_id = getattr(
        request.state,
        "request_id",
        "-",
    )

    logger.exception(
        "Unexpected application error | method=%s | path=%s",
        request.method,
        request.url.path,
        extra={"request_id": request_id},
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "details": {
                    "request_id": request_id,
                },
            },
        },
        headers={
            "X-Request-ID": request_id,
        },
    )


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get(
    "/",
    tags=["System"],
)
async def root():
    return {
        "application": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


# ---------------------------------------------------------------------------
# API routers
# ---------------------------------------------------------------------------
app.include_router(
    system_router,
    prefix=settings.api_prefix,
)

app.include_router(
    users_router,
    prefix=settings.api_prefix,
)

app.include_router(
    auth_router,
    prefix=settings.api_prefix,
)

app.include_router(
    rbac_router,
    prefix=settings.api_prefix,
)

app.include_router(
    audit_router,
    prefix=settings.api_prefix,
)

app.include_router(
    notifications_router,
    prefix=settings.api_prefix,
)

app.include_router(
    school_router,
    prefix=settings.api_prefix,
)

app.include_router(
    students_router,
    prefix=settings.api_prefix,
)

app.include_router(
    parents_router,
    prefix=settings.api_prefix,
)

app.include_router(
    documents_router,
    prefix=settings.api_prefix,
)

app.include_router(
    admissions_router,
    prefix=settings.api_prefix,
)

app.include_router(
    fee_structures_router,
    prefix=settings.api_prefix,
)

app.include_router(
    student_fee_plans_router,
    prefix=settings.api_prefix,
)