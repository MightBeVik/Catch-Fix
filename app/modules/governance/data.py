"""Starter data for governance and compliance."""

GOVERNANCE_OVERVIEW = {
    "title": "Governance & Compliance",
    "subtitle": "Role-based access control, audit logging, data handling policies, and compliance evidence export for regulatory requirements.",
    "roles": [
        {"role": "Admin", "scope": "Service changes, schedules, exports, approvals"},
        {"role": "Maintainer", "scope": "Incidents, maintenance plans, evaluations"},
        {"role": "Viewer", "scope": "Read-only dashboards and evidence packs"},
    ],
    "audit_log": [
        "14:07 Admin updated drift threshold for Legal Review Agent.",
        "13:58 Maintainer opened incident INC-401 from dashboard alert.",
        "13:42 System recorded failed availability handshake for CustomerSentiment_Bot.",
    ],
    "policy": [
        "Synthetic data only. No real employee, customer, or company data.",
        "LLM outputs are assistive only; human approval is required before saving.",
        "Cloud routing must be explained when a non-local LLM is used.",
    ],
    "exports": [
        "Evaluation summaries",
        "Incident list",
        "Maintenance actions taken",
        "Audit log entries for a selected time period",
    ],
}