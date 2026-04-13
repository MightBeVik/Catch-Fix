"""Monitoring module API — Module 2."""

import json
import random
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.monitoring.data import (
    DRIFT_THRESHOLD,
    SERVICES,
    get_headline_stats,
)
from app.modules.monitoring.database import (
    save_eval_result,
    get_all_eval_results,
)
"""Monitoring module API."""

from fastapi import APIRouter

from app.modules.monitoring.data import DASHBOARD


router = APIRouter(prefix="/monitoring", tags=["monitoring"])


class EvalRunRequest(BaseModel):
    service_id: str
    triggered_by: str = "manual"


def check_formatting(output: str) -> dict:
    """Eval category 1 — checks if LLM output is valid JSON."""
    try:
        json.loads(output)
        return {
            "category": "formatting_correctness",
            "passed": True,
            "score": 100.0,
            "detail": "Output is valid JSON",
        }
    except (json.JSONDecodeError, ValueError):
        partial = output.strip().startswith("{") or output.strip().startswith("[")
        return {
            "category": "formatting_correctness",
            "passed": False,
            "score": 40.0 if partial else 0.0,
            "detail": "Output is not valid JSON",
        }


def check_policy_adherence(output: str) -> dict:
    """Eval category 2 — scans for PII in output."""
    pii_patterns = {
        "email": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
        "phone": r"\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "sin":   r"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b",
    }
    found = []
    for pii_type, pattern in pii_patterns.items():
        if re.search(pattern, output):
            found.append(pii_type)

    if found:
        return {
            "category": "policy_adherence",
            "passed": False,
            "score": 0.0,
            "detail": f"PII detected in output: {', '.join(found)}",
        }
    return {
        "category": "policy_adherence",
        "passed": True,
        "score": 100.0,
        "detail": "No PII detected in output",
    }


def simulate_llm_output(service_id: str) -> str:
    """Simulate an LLM response for evaluation."""
    good_outputs = [
        '{"status": "ok", "result": "Analysis complete", "confidence": 0.94}',
        '{"classification": "low_risk", "score": 0.87, "flags": []}',
        '{"summary": "No anomalies detected", "processed": 142}',
        '{"response": "Task completed", "tokens_used": 312}',
    ]
    bad_outputs = [
        "Here is the result: Analysis complete (not valid JSON)",
        '{"result": "done", "user_email": "test@example.com"}',
        "The answer is 42",
        '{"partial": true',
    ]
    if service_id == "SRV-102-LK":
        outputs = bad_outputs * 3 + good_outputs
    else:
        outputs = good_outputs * 4 + bad_outputs
    return random.choice(outputs)


@router.get("/dashboard")
async def get_dashboard() -> dict:
    """Return all services with live metrics and headline stats."""
    all_results = get_all_eval_results()
    return {
        "stats":              get_headline_stats(),
        "services":           SERVICES,
        "drift_threshold":    DRIFT_THRESHOLD,
        "eval_results_count": len(all_results),
    }


@router.post("/eval/run")
async def run_evaluation(request: EvalRunRequest) -> dict:
    """Run the evaluation harness — generate, evaluate, store, return."""
    # 1. Find the service
    service = next(
        (s for s in SERVICES if s["id"] == request.service_id), None
    )
    if not service:
        raise HTTPException(
            status_code=404,
            detail=f"Service {request.service_id} not found"
        )

    # 2. Generate simulated LLM output
    llm_output = simulate_llm_output(request.service_id)

    # 3. Run both evaluation categories
    formatting_result = check_formatting(llm_output)
    policy_result = check_policy_adherence(llm_output)

    # 4. Calculate overall quality score
    quality_score = round(
        (formatting_result["score"] + policy_result["score"]) / 2, 1
    )

    # 5. Check drift and update service
    drift_flagged = quality_score < DRIFT_THRESHOLD
    service["metrics"]["quality_score"] = quality_score
    service["drift_flagged"] = drift_flagged
    service["status"] = "Drift Detected" if drift_flagged else "Active"
    service["badge"] = "badge-drift" if drift_flagged else "badge-active"

    # 6. Save to SQLite with timestamp
    result = {
        "service_id":      request.service_id,
        "service_name":    service["name"],
        "quality_score":   quality_score,
        "drift_flagged":   drift_flagged,
        "drift_threshold": DRIFT_THRESHOLD,
        "checks":          [formatting_result, policy_result],
        "triggered_by":    request.triggered_by,
        "evaluated_at":    datetime.now(timezone.utc).isoformat(),
    }
    save_eval_result(result)

    # 7. Return to frontend
    result["id"] = len(get_all_eval_results())
    return result


@router.get("/eval/results")
async def get_eval_results() -> dict:
    """Return all stored evaluation results from SQLite, newest first."""
    results = get_all_eval_results()
    return {
        "total":   len(results),
        "results": results,
    }
@router.get("/dashboard")
async def get_dashboard() -> dict[str, object]:
    return DASHBOARD
