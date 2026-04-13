"""Monitoring module data store."""

from datetime import datetime, timezone

DRIFT_THRESHOLD = 85.0

SERVICES = [
    {
        "id": "SRV-882-QX",
        "name": "RiskAssessment_v4",
        "version": "V2.4.0-Production",
        "status": "Active",
        "badge": "badge-active",
        "metrics": {
            "latency_ms": 142,
            "error_rate": 0.02,
            "quality_score": 94.0,
        },
        "drift_flagged": False,
        "trend_bars": [65, 70, 60, 75, 72, 68, 80, 78, 94],
        "trend_status": "Stable",
    },
    {
        "id": "SRV-102-LK",
        "name": "SemanticParser_Alpha",
        "version": "V1.1.2-Beta",
        "status": "Drift Detected",
        "badge": "badge-drift",
        "metrics": {
            "latency_ms": 312,
            "error_rate": 1.4,
            "quality_score": 72.0,
        },
        "drift_flagged": True,
        "trend_bars": [90, 85, 80, 75, 70, 65, 60, 68, 72],
        "trend_status": "-12% quality drop",
    },
    {
        "id": "SRV-441-ZZ",
        "name": "CustomerSentiment_Bot",
        "version": "V3.0.0-Stable",
        "status": "Optimized",
        "badge": "badge-optimized",
        "metrics": {
            "latency_ms": 88,
            "error_rate": 0.00,
            "quality_score": 99.0,
        },
        "drift_flagged": False,
        "trend_bars": [82, 85, 88, 90, 92, 91, 95, 97, 99],
        "trend_status": "Improving",
    },
    {
        "id": "SRV-002-PP",
        "name": "AutoCategorizer_X",
        "version": "V2.1.5-Prod",
        "status": "Under Load",
        "badge": "badge-load",
        "metrics": {
            "latency_ms": 940,
            "error_rate": 0.4,
            "quality_score": 89.0,
        },
        "drift_flagged": False,
        "trend_bars": [55, 60, 50, 45, 58, 70, 75, 82, 89],
        "trend_status": "High Latency",
    },
]

EVAL_RESULTS: list[dict] = []

def get_headline_stats() -> list[dict]:
    total = len(SERVICES)
    healthy = sum(1 for s in SERVICES if not s["drift_flagged"])
    drift_count = sum(1 for s in SERVICES if s["drift_flagged"])
    avg_quality = round(
        sum(s["metrics"]["quality_score"] for s in SERVICES) / total, 1
    )
    return [
        {
            "label": "Total Services",
            "value": str(total),
            "sub": "Registered",
            "tone": "positive",
        },
        {
            "label": "Avg Quality Score",
            "value": f"{avg_quality}%",
            "sub": "Across all services",
            "tone": "good" if avg_quality >= DRIFT_THRESHOLD else "warn",
        },
        {
            "label": "Drift Alerts",
            "value": f"{drift_count:02d}",
            "sub": "Requires review" if drift_count > 0 else "All clear",
            "tone": "warn" if drift_count > 0 else "positive",
        },
        {
            "label": "Healthy Services",
            "value": str(healthy),
            "sub": f"{round(healthy/total*100, 1)}% operational",
            "tone": "good",
        },
    ]
"""Starter data for monitoring and evaluation."""

DASHBOARD = {
    "headline": {
        "title": "Global Governance Core",
        "subtitle": "Real-time health monitoring of autonomous AI agents across the sovereign ledger network.",
        "network": "Mainnet-Alpha",
    },
    "stats": [
        {"label": "Total Services", "value": "128", "sub": "+4 this week", "tone": "positive"},
        {"label": "Health Percentage", "value": "98.2%", "sub": "Operational baseline", "tone": "good"},
        {"label": "Active Drift Alerts", "value": "03", "sub": "Requires Review", "tone": "warn"},
        {"label": "Open Incidents", "value": "00", "sub": "All clear", "tone": "positive"},
    ],
    "services": [
        {
            "name": "Customer Support Bot",
            "version": "V2.4.0-Production",
            "status": "Active",
            "badge": "badge-active",
            "metrics": {"Latency": "142ms", "Error Rate": "0.02%", "Score": "94%"},
            "trend_status": "Last 24h",
        },
        {
            "name": "Legal Review Agent",
            "version": "V1.1.2-Beta",
            "status": "Drift Detected",
            "badge": "badge-drift",
            "metrics": {"Latency": "312ms", "Error Rate": "1.4%", "Score": "82%"},
            "trend_status": "-12% volatility",
        },
        {
            "name": "Risk Analysis Engine",
            "version": "V3.0.0-Stable",
            "status": "Optimized",
            "badge": "badge-optimized",
            "metrics": {"Latency": "88ms", "Error Rate": "0.00%", "Score": "99%"},
            "trend_status": "Stable",
        },
        {
            "name": "Content Moderator",
            "version": "V2.1.5-Prod",
            "status": "Active",
            "badge": "badge-active",
            "metrics": {"Latency": "204ms", "Error Rate": "0.08%", "Score": "91%"},
            "trend_status": "Nominal",
        },
        {
            "name": "Translation Core",
            "version": "V4.2.0-Canary",
            "status": "Under Load",
            "badge": "badge-load",
            "metrics": {"Latency": "940ms", "Error Rate": "0.4%", "Score": "89%"},
            "trend_status": "High Latency",
        },
    ],
    "feed": [
        "Auto-scaling event: 4 new nodes added to Content Moderator cluster.",
        "Drift threshold exceeded on Legal Review Agent. Initiating audit.",
        "Governance report signed and anchored to Sovereign Ledger for Epoch 84.",
    ],
    "compliance": {"score": 90, "label": "Sovereign Standard"},
}
