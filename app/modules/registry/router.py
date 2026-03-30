"""Registry module API."""

from fastapi import APIRouter, HTTPException

from app.modules.registry.data import FEED, SERVICES, SUMMARY


router = APIRouter(prefix="/registry", tags=["registry"])


@router.get("/summary")
async def get_registry_summary() -> dict[str, object]:
    return {"summary": SUMMARY, "feed": FEED}


@router.get("/services")
async def list_services() -> list[dict[str, str]]:
    return SERVICES


@router.get("/services/{service_id}")
async def get_service(service_id: str) -> dict[str, str]:
    for service in SERVICES:
        if service["id"] == service_id:
            return service
    raise HTTPException(status_code=404, detail="Service not found")