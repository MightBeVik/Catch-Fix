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