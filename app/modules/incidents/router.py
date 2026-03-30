"""Incidents and maintenance API."""

from fastapi import APIRouter

from app.modules.incidents.data import INCIDENT_OVERVIEW, MAINTENANCE_OVERVIEW


router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/overview")
async def get_incident_overview() -> dict[str, object]:
    return INCIDENT_OVERVIEW


@router.get("/maintenance")
async def get_maintenance_overview() -> dict[str, object]:
    return MAINTENANCE_OVERVIEW