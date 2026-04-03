"""Connection test helpers for registry services."""

from __future__ import annotations

import json
import os
import random
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import anyio


DEFAULT_TEST_PROMPT = "Reply with the single word PONG."


async def execute_connection_test(service: dict[str, Any], prompt: str = DEFAULT_TEST_PROMPT) -> dict[str, Any]:
    provider = str(service.get("provider", "mock"))

    if provider == "mock":
        return await _run_mock_test(service, prompt)
    if provider == "openai_compatible":
        return await anyio.to_thread.run_sync(_run_openai_compatible_test, service, prompt)
    if provider == "ollama":
        return await anyio.to_thread.run_sync(_run_ollama_test, service, prompt)

    return {
        "success": False,
        "status": "error",
        "latency_ms": None,
        "detail": f"Unsupported provider '{provider}'.",
        "response_preview": "",
        "provider": provider,
        "tested_at": _utc_now(),
        "prompt": prompt,
    }


async def _run_mock_test(service: dict[str, Any], prompt: str) -> dict[str, Any]:
    connection = service.get("connection", {})
    outcome = str(connection.get("mock_outcome", "success"))
    latency_ms = random.randint(140, 420)
    if outcome == "fail":
        latency_ms = random.randint(900, 1500)

    await anyio.sleep(latency_ms / 1000)

    if outcome == "fail":
        return {
            "success": False,
            "status": "error",
            "latency_ms": latency_ms,
            "detail": "Gateway timeout while contacting the provider.",
            "response_preview": "",
            "provider": "mock",
            "tested_at": _utc_now(),
            "prompt": prompt,
        }

    model_name = str(service["model_name"])
    return {
        "success": True,
        "status": "online",
        "latency_ms": latency_ms,
        "detail": "Connection test completed successfully.",
        "response_preview": f"PONG from {model_name}",
        "provider": "mock",
        "tested_at": _utc_now(),
        "prompt": prompt,
    }


def _run_openai_compatible_test(service: dict[str, Any], prompt: str) -> dict[str, Any]:
    connection = service.get("connection", {})
    endpoint = str(connection.get("endpoint", "")).strip()
    api_key_env = str(connection.get("api_key_env", "OPENAI_API_KEY")).strip()
    api_key = os.environ.get(api_key_env, "")

    if not endpoint:
        return _error_result("openai_compatible", prompt, "Missing endpoint configuration.")
    if not api_key:
        return _error_result(
            "openai_compatible",
            prompt,
            f"Missing API key environment variable '{api_key_env}'.",
        )

    payload = {
        "model": service["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 16,
        "temperature": 0,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    return _post_json("openai_compatible", endpoint, payload, headers, prompt)


def _run_ollama_test(service: dict[str, Any], prompt: str) -> dict[str, Any]:
    connection = service.get("connection", {})
    endpoint = str(connection.get("endpoint", "http://127.0.0.1:11434/api/generate")).strip()
    payload = {
        "model": service["model_name"],
        "prompt": prompt,
        "stream": False,
    }
    headers = {"Content-Type": "application/json"}
    return _post_json("ollama", endpoint, payload, headers, prompt)


def _post_json(
    provider: str,
    endpoint: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    prompt: str,
) -> dict[str, Any]:
    started = time.perf_counter()
    request = Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        return _error_result(provider, prompt, f"HTTP {exc.code} from provider endpoint.", started)
    except URLError as exc:
        return _error_result(provider, prompt, f"Unable to reach provider endpoint: {exc.reason}", started)
    except Exception as exc:  # pragma: no cover - defensive for local integrations
        return _error_result(provider, prompt, str(exc), started)

    latency_ms = int((time.perf_counter() - started) * 1000)
    preview = _extract_preview(body)
    return {
        "success": True,
        "status": "online",
        "latency_ms": latency_ms,
        "detail": "Connection test completed successfully.",
        "response_preview": preview,
        "provider": provider,
        "tested_at": _utc_now(),
        "prompt": prompt,
    }


def _extract_preview(body: str) -> str:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return body[:120]

    if isinstance(payload, dict):
        if "choices" in payload:
            message = payload["choices"][0].get("message", {})
            return str(message.get("content", ""))[:120]
        if "response" in payload:
            return str(payload["response"])[:120]
    return json.dumps(payload)[:120]


def _error_result(provider: str, prompt: str, detail: str, started: float | None = None) -> dict[str, Any]:
    latency_ms = None
    if started is not None:
        latency_ms = int((time.perf_counter() - started) * 1000)

    return {
        "success": False,
        "status": "error",
        "latency_ms": latency_ms,
        "detail": detail,
        "response_preview": "",
        "provider": provider,
        "tested_at": _utc_now(),
        "prompt": prompt,
    }


def _utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())