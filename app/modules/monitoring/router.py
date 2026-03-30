"""Monitoring module API."""

from fastapi import APIRouter

from app.modules.monitoring.data import DASHBOARD


router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/dashboard")
async def get_dashboard() -> dict[str, object]:
    return DASHBOARD