"""In-memory data store for the registry module."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from itertools import count
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


_SERVICE_SEED = [
    {
        "id": "SRV-882-QX",
        "name": "RiskAssessment_v4",
        "owner": "FinOps Core",
        "environment": "PROD",
        "model_name": "GPT-4-Turbo",
        "sensitivity": "Confidential",
        "provider": "mock",
        "connection": {"mock_outcome": "success"},
    },
    {
        "id": "SRV-102-LK",
        "name": "SemanticParser_Alpha",
        "owner": "NLP Research",
        "environment": "DEV",
        "model_name": "Llama-3-70b",
        "sensitivity": "Internal",
        "provider": "mock",
        "connection": {"mock_outcome": "success"},
    },
    {
        "id": "SRV-441-ZZ",
        "name": "CustomerSentiment_Bot",
        "owner": "Marketing Dept",
        "environment": "PROD",
        "model_name": "Claude-3-Opus",
        "sensitivity": "Public",
        "provider": "mock",
        "connection": {"mock_outcome": "fail"},
    },
    {
        "id": "SRV-002-PP",
        "name": "AutoCategorizer_X",
        "owner": "Logistics Core",
        "environment": "DEV",
        "model_name": "Mistral-Large",
        "sensitivity": "Internal",
        "provider": "mock",
        "connection": {"mock_outcome": "success"},
    },
]

SERVICES: list[dict[str, Any]] = deepcopy(_SERVICE_SEED)

TEST_HISTORY: dict[str, list[dict[str, Any]]] = {
    "SRV-882-QX": [
        {
            "success": True,
            "status": "online",
            "latency_ms": 182,
            "detail": "Mock registry ping succeeded.",
            "response_preview": "PONG from GPT-4-Turbo",
            "provider": "mock",
            "tested_at": "2026-04-02T20:45:00+00:00",
            "prompt": "Reply with the single word PONG.",
        }
    ],
    "SRV-102-LK": [
        {
            "success": True,
            "status": "online",
            "latency_ms": 241,
            "detail": "Mock registry ping succeeded.",
            "response_preview": "PONG from Llama-3-70b",
            "provider": "mock",
            "tested_at": "2026-04-02T20:46:00+00:00",
            "prompt": "Reply with the single word PONG.",
        }
    ],
    "SRV-441-ZZ": [
        {
            "success": False,
            "status": "error",
            "latency_ms": 1288,
            "detail": "Gateway timeout while contacting the provider.",
            "response_preview": "",
            "provider": "mock",
            "tested_at": "2026-04-02T20:47:00+00:00",
            "prompt": "Reply with the single word PONG.",
        }
    ],
    "SRV-002-PP": [
        {
            "success": True,
            "status": "online",
            "latency_ms": 154,
            "detail": "Mock registry ping succeeded.",
            "response_preview": "PONG from Mistral-Large",
            "provider": "mock",
            "tested_at": "2026-04-02T20:48:00+00:00",
            "prompt": "Reply with the single word PONG.",
        }
    ],
}

ACTIVITY_LOG: list[dict[str, str]] = [
    {
        "timestamp": "2026-04-02T20:48:00+00:00",
        "message": "AutoCategorizer_X connection verified successfully in DEV.",
    },
    {
        "timestamp": "2026-04-02T20:47:00+00:00",
        "message": "CustomerSentiment_Bot failed its latest connection test with a timeout.",
    },
    {
        "timestamp": "2026-04-02T20:46:00+00:00",
        "message": "SemanticParser_Alpha returned a successful PONG health response.",
    },
    {
        "timestamp": "2026-04-02T20:45:00+00:00",
        "message": "RiskAssessment_v4 connection verified and ready for production traffic.",
    },
]

_SERVICE_COUNTER = count(300)


def _latest_test(service_id: str) -> dict[str, Any] | None:
    history = TEST_HISTORY.get(service_id, [])
    if not history:
        return None
    return deepcopy(history[0])


def _format_latency(latency_ms: int | None) -> str:
    if latency_ms is None:
        return "Not tested"
    return f"{latency_ms} ms"


def _service_status(service_id: str) -> str:
    latest = _latest_test(service_id)
    if latest is None:
        return "untested"
    return str(latest["status"])


def _serialize_service(service: dict[str, Any]) -> dict[str, Any]:
    latest = _latest_test(str(service["id"]))
    return {
        "id": service["id"],
        "name": service["name"],
        "owner": service["owner"],
        "environment": service["environment"],
        "model_name": service["model_name"],
        "sensitivity": service["sensitivity"],
        "status": _service_status(str(service["id"])),
        "last_test": latest
        or {
            "success": None,
            "status": "untested",
            "latency_ms": None,
            "detail": "Connection has not been tested yet.",
            "response_preview": "",
            "provider": service.get("provider", "mock"),
            "tested_at": None,
            "prompt": None,
        },
        "latency": _format_latency(latest["latency_ms"]) if latest else "Not tested",
    }


def list_services() -> list[dict[str, Any]]:
    return [_serialize_service(service) for service in SERVICES]


def get_service(service_id: str) -> dict[str, Any] | None:
    for service in SERVICES:
        if service["id"] == service_id:
            detail = _serialize_service(service)
            detail["provider"] = service.get("provider", "mock")
            detail["test_history"] = deepcopy(TEST_HISTORY.get(service_id, []))
            return detail
    return None


def create_service(payload: dict[str, str]) -> dict[str, Any]:
    service_id = f"SRV-{next(_SERVICE_COUNTER):03d}"
    service = {
        "id": service_id,
        "name": payload["name"].strip(),
        "owner": payload["owner"].strip(),
        "environment": payload["environment"].upper(),
        "model_name": payload["model_name"].strip(),
        "sensitivity": payload["sensitivity"].title(),
        "provider": "mock",
        "connection": {"mock_outcome": "success"},
    }
    SERVICES.insert(0, service)
    ACTIVITY_LOG.insert(
        0,
        {
            "timestamp": _utc_now(),
            "message": f"{service['name']} was registered by {service['owner']} in {service['environment']}.",
        },
    )
    return get_service(service_id) or _serialize_service(service)


def record_test_result(service_id: str, result: dict[str, Any]) -> dict[str, Any] | None:
    TEST_HISTORY.setdefault(service_id, []).insert(0, deepcopy(result))
    TEST_HISTORY[service_id] = TEST_HISTORY[service_id][:10]

    service = get_service(service_id)
    if service is None:
        return None

    service_name = service["name"]
    if result["success"]:
        message = (
            f"{service_name} returned a successful connection test in {result['latency_ms']} ms."
        )
    else:
        message = f"{service_name} connection test failed: {result['detail']}"

    ACTIVITY_LOG.insert(0, {"timestamp": result["tested_at"], "message": message})
    del ACTIVITY_LOG[12:]
    return get_service(service_id)


def get_activity(limit: int = 6) -> list[dict[str, str]]:
    return deepcopy(ACTIVITY_LOG[:limit])


def build_summary() -> dict[str, Any]:
    services = list_services()
    total = len(services)
    production = sum(service["environment"] == "PROD" for service in services)
    healthy = sum(service["status"] == "online" for service in services)
    failed = sum(service["status"] == "error" for service in services)
    untested = sum(service["status"] == "untested" for service in services)

    if total:
        health_ratio = int((healthy / total) * 100)
    else:
        health_ratio = 0

    return {
        "stats": [
            {"label": "Total Connections", "value": str(total), "sub": "Registry entries", "tone": "info"},
            {"label": "Production", "value": str(production), "sub": "PROD endpoints", "tone": "neutral"},
            {"label": "Healthy", "value": str(healthy), "sub": f"{health_ratio}% passing", "tone": "positive"},
            {"label": "Failures", "value": str(failed), "sub": f"{untested} untested", "tone": "danger"},
        ]
    }