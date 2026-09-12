from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine


router = APIRouter(prefix="/system", tags=["System"])

settings = get_settings()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "application": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/health/db")
async def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception:
        return {
            "status": "error",
            "database": "unavailable",
        }