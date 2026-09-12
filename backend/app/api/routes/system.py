from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.schemas.common import ErrorResponse, SuccessResponse

router = APIRouter(prefix="/system", tags=["System"])
settings = get_settings()


@router.get(
    "/health",
    response_model=SuccessResponse[dict],
)
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "application": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
        },
    }


@router.get(
    "/health/db",
    response_model=SuccessResponse[dict],
)
async def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "success": True,
            "data": {
                "status": "ok",
                "database": "connected",
            },
        }

    except Exception:
        return {
            "success": True,
            "data": {
                "status": "error",
                "database": "unavailable",
            },
        }