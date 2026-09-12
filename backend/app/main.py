from fastapi import FastAPI

from app.api.routes.system import router as system_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=f"{settings.app_name} API",
    description="Production-grade School Operating System API",
    version=settings.app_version,
)


app.include_router(
    system_router,
    prefix=settings.api_prefix,
)