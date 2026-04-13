"""Governance and compliance API."""

from fastapi import APIRouter

from app.modules.governance.data import GOVERNANCE_OVERVIEW


router = APIRouter(prefix="/governance", tags=["governance"])


@router.get("/overview")
async def get_governance_overview() -> dict[str, object]:
    return GOVERNANCE_OVERVIEW