export const incidents = [
  {
    id: "INC-401",
    service: "Legal Review Agent",
    severity: "High",
    symptoms: "Quality score dropped below drift threshold.",
    timeline: "13:58 drift alert triggered",
  },
  {
    id: "INC-402",
    service: "CustomerSentiment_Bot",
    severity: "Critical",
    symptoms: "Availability test returned timeout 504.",
    timeline: "13:42 handshake failure",
  },
];

export const troubleshootingChecklist = [
  "Data issue?",
  "Prompt change?",
  "Model update?",
  "Infrastructure problem?",
  "Safety/policy failure?",
];

export const maintenancePlans = [
  {
    service: "Legal Review Agent",
    window: "Tonight 11:00 PM - 12:00 AM",
    risk: "High",
    rollback: "Revert to V1.1.1 baseline",
    validation: "Run evaluation suite + spot-check stakeholder prompts",
  },
  {
    service: "Translation Core",
    window: "Tomorrow 7:00 AM - 8:00 AM",
    risk: "Medium",
    rollback: "Shift traffic to V4.1.8 stable",
    validation: "Latency benchmark + formatting correctness tests",
  },
];