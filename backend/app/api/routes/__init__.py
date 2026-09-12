from app.api.routes.system import router as system_router
from app.api.routes.users import router as users_router

__all__ = [
    "system_router",
    "users_router",
]