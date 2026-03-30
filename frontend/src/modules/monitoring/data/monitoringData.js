export const monitoringStats = [
  { label: "Total Services", value: "128", sub: "↗ +4 this week", tone: "positive" },
  { label: "Health Percentage", value: "98.2%", sub: "Operational baseline", tone: "good" },
  { label: "Active Drift Alerts", value: "03", sub: "↑ Requires Review", tone: "warning" },
  { label: "Open Incidents", value: "00", sub: "✓ All clear", tone: "positive" },
];

export const monitoringServices = [
  {
    name: "Customer Support Bot",
    version: "V2.4.0-Production",
    status: "Active",
    badge: "badge-active",
    metrics: [
      { label: "Latency", value: "142ms", tone: "neutral" },
      { label: "Error Rate", value: "0.02%", tone: "good" },
      { label: "Score", value: "94%", tone: "good" },
    ],
    bars: [65, 70, 60, 75, 72, 68, 80, 78, 90],
    trendStatus: "Last 24h",
  },
  {
    name: "Legal Review Agent",
    version: "V1.1.2-Beta",
    status: "⚠ Drift Detected",
    badge: "badge-drift",
    drift: true,
    metrics: [
      { label: "Latency", value: "312ms", tone: "warn" },
      { label: "Error Rate", value: "1.4%", tone: "warn" },
      { label: "Score", value: "82%", tone: "warn" },
    ],
    bars: [80, 75, 78, 55, 65, 50, 45, 60, 52],
    trendStatus: "-12% volatility",
  },
  {
    name: "Risk Analysis Engine",
    version: "V3.0.0-Stable",
    status: "Optimized",
    badge: "badge-optimized",
    metrics: [
      { label: "Latency", value: "88ms", tone: "good" },
      { label: "Error Rate", value: "0.00%", tone: "good" },
      { label: "Score", value: "99%", tone: "good" },
    ],
    bars: [82, 85, 83, 88, 90, 92, 91, 95, 98],
    trendStatus: "Stable",
  },
  {
    name: "Content Moderator",
    version: "V2.1.5-Prod",
    status: "Active",
    badge: "badge-active",
    metrics: [
      { label: "Latency", value: "204ms", tone: "neutral" },
      { label: "Error Rate", value: "0.08%", tone: "good" },
      { label: "Score", value: "91%", tone: "good" },
    ],
    bars: [70, 72, 68, 75, 80, 78, 76, 85, 88],
    trendStatus: "Nominal",
  },
  {
    name: "Translation Core",
    version: "V4.2.0-Canary",
    status: "Under Load",
    badge: "badge-load",
    metrics: [
      { label: "Latency", value: "940ms", tone: "warn" },
      { label: "Error Rate", value: "0.4%", tone: "neutral" },
      { label: "Score", value: "89%", tone: "neutral" },
    ],
    bars: [55, 60, 50, 45, 58, 40, 52, 55, 48],
    trendStatus: "High Latency",
  },
];

export const monitoringFeed = [
  "Auto-scaling event: 4 new nodes added to Content Moderator cluster.",
  "Drift threshold exceeded on Legal Review Agent. Initiating audit.",
  "Governance report signed and anchored to Sovereign Ledger for Epoch 84.",
];