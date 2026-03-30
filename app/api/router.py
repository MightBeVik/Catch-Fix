"""Aggregate API router for all module areas."""

from fastapi import APIRouter

from app.core.module_manifest import MODULE_MANIFEST
from app.modules.governance.router import router as governance_router
from app.modules.incidents.router import router as incidents_router
from app.modules.monitoring.router import router as monitoring_router
from app.modules.registry.router import router as registry_router


api_router = APIRouter()


@api_router.get("/meta")
async def get_meta() -> dict[str, object]:
    return {
        "project": "Catch-Fix",
        "frontend": "React + Vite",
        "backend": "FastAPI",
        "modules": MODULE_MANIFEST,
    }


api_router.include_router(registry_router)
api_router.include_router(monitoring_router)
api_router.include_router(incidents_router)
api_router.include_router(governance_router)