"""Starter data for the registry module."""

SUMMARY = {
    "stats": [
        {"label": "Total Assets", "value": "124", "sub": "+3.4%", "tone": "positive"},
        {"label": "Operational", "value": "121", "sub": "97.5%", "tone": "info"},
        {"label": "Incidents", "value": "03", "sub": "Critical", "tone": "danger"},
        {"label": "Compute Load", "value": "82%", "sub": "Optimal", "tone": "positive"},
    ],
    "distribution": [
        {"label": "Large Language Models", "value": 64, "tone": "cyan"},
        {"label": "Vision & Synthesis", "value": 21, "tone": "purple"},
        {"label": "Predictive Analytics", "value": 15, "tone": "amber"},
    ],
}

SERVICES = [
    {
        "id": "SRV-882-QX",
        "name": "RiskAssessment_v4",
        "owner": "FinOps Core",
        "environment": "PROD",
        "model_name": "GPT-4-Turbo",
        "sensitivity": "Confidential",
        "status": "online",
        "latency": "12ms",
        "action": "Test Connection",
    },
    {
        "id": "SRV-102-LK",
        "name": "SemanticParser_Alpha",
        "owner": "NLP Research",
        "environment": "DEV",
        "model_name": "Llama-3-70b",
        "sensitivity": "Internal",
        "status": "testing",
        "latency": "Testing...",
        "action": "Testing...",
    },
    {
        "id": "SRV-441-ZZ",
        "name": "CustomerSentiment_Bot",
        "owner": "Marketing Dept",
        "environment": "PROD",
        "model_name": "Claude-3-Opus",
        "sensitivity": "Public",
        "status": "error",
        "latency": "Timeout (504)",
        "action": "Retry Test",
    },
    {
        "id": "SRV-002-PP",
        "name": "AutoCategorizer_X",
        "owner": "Logistics Core",
        "environment": "DEV",
        "model_name": "Mistral-Large",
        "sensitivity": "Internal",
        "status": "online",
        "latency": "8ms",
        "action": "Test Connection",
    },
]

FEED = [
    "RiskAssessment_v4 connection verified successfully from node EU-WEST-1. Response latency: 12ms.",
    "Scheduled governance audit initiated for NLP Research group. Scan depth: Level 4.",
    "CRITICAL: Registry entry CustomerSentiment_Bot failed availability handshake. Protocol 7 triggered.",
]