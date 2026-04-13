"""Starter data for incidents and maintenance planning."""

INCIDENT_OVERVIEW = {
    "title": "Incident Triage Center",
    "subtitle": "Centralized incident management with AI-assisted diagnostics, guided troubleshooting, and stakeholder communication workflows.",
    "incidents": [
        {
            "id": "INC-401",
            "service": "Legal Review Agent",
            "severity": "High",
            "symptom": "Quality score dropped below drift threshold.",
            "timeline": "13:58 drift alert triggered",
        },
        {
            "id": "INC-402",
            "service": "CustomerSentiment_Bot",
            "severity": "Critical",
            "symptom": "Availability test returned timeout 504.",
            "timeline": "13:42 handshake failure",
        },
    ],
    "checklist": [
        "Data issue?",
        "Prompt change?",
        "Model update?",
        "Infrastructure problem?",
        "Safety/policy failure?",
    ],
    "summary": "Create incidents, run guided troubleshooting checklists, generate LLM-assisted summaries with human approval, and manage escalation workflows.",
}

MAINTENANCE_OVERVIEW = {
    "title": "Maintenance Planner",
    "subtitle": "Schedule evaluations, plan update windows, manage rollback procedures, and coordinate maintenance across the service fleet.",
    "plans": [
        {
            "service": "Legal Review Agent",
            "window": "Tonight 11:00 PM - 12:00 AM",
            "risk": "High",
            "rollback": "Revert to V1.1.1 baseline",
            "validation": "Run evaluation suite + spot-check stakeholder prompts",
        },
        {
            "service": "Translation Core",
            "window": "Tomorrow 7:00 AM - 8:00 AM",
            "risk": "Medium",
            "rollback": "Shift traffic to V4.1.8 stable",
            "validation": "Latency benchmark + formatting correctness tests",
        },
    ],
    "summary": "Plan and schedule evaluation runs, define update windows with rollback procedures, and manage service maintenance lifecycle with approval workflows.",
}