"""Registry module API."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.modules.registry.connection_service import DEFAULT_TEST_PROMPT, execute_connection_test
from app.modules.registry.data import build_summary, create_service, get_activity, get_service, list_services, record_test_result


router = APIRouter(prefix="/registry", tags=["registry"])


class RegistryServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    owner: str = Field(min_length=2, max_length=80)
    environment: Literal["DEV", "PROD", "dev", "prod"]
    model_name: str = Field(min_length=2, max_length=120)
    sensitivity: Literal[
        "Public",
        "Internal",
        "Confidential",
        "public",
        "internal",
        "confidential",
    ]


class ConnectionTestRequest(BaseModel):
    prompt: str = Field(default=DEFAULT_TEST_PROMPT, min_length=1, max_length=400)


@router.get("/summary")
async def get_registry_summary() -> dict[str, object]:
    return {"summary": build_summary(), "feed": get_activity()}


@router.get("/services")
async def get_registry_services() -> list[dict[str, object]]:
    return list_services()


@router.get("/services/{service_id}")
async def get_registry_service(service_id: str) -> dict[str, object]:
    service = get_service(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/services")
async def create_registry_service(payload: RegistryServiceCreate) -> dict[str, object]:
    return create_service(payload.model_dump())


@router.post("/services/{service_id}/test-connection")
async def test_registry_service_connection(
    service_id: str,
    payload: ConnectionTestRequest,
) -> dict[str, object]:
    service = get_service(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    result = await execute_connection_test(service, payload.prompt)
    updated_service = record_test_result(service_id, result)
    if updated_service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return updated_service