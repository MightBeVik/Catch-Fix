export const registryStats = [
  { label: "Total Assets", value: "124", sub: "+3.4%", tone: "positive" },
  { label: "Operational", value: "121", sub: "97.5%", tone: "info" },
  { label: "Incidents", value: "03", sub: "Critical", tone: "danger" },
  { label: "Compute Load", value: "82%", sub: "Optimal", tone: "positive" },
];

export const registryServices = [
  {
    name: "RiskAssessment_v4",
    id: "SRV-882-QX",
    owner: "FinOps Core",
    environment: "PROD",
    modelName: "GPT-4-Turbo",
    sensitivity: "Confidential",
    status: "online",
    latency: "12ms",
    action: "Test Connection",
  },
  {
    name: "SemanticParser_Alpha",
    id: "SRV-102-LK",
    owner: "NLP Research",
    environment: "DEV",
    modelName: "Llama-3-70b",
    sensitivity: "Internal",
    status: "testing",
    latency: "Testing...",
    action: "Testing...",
  },
  {
    name: "CustomerSentiment_Bot",
    id: "SRV-441-ZZ",
    owner: "Marketing Dept",
    environment: "PROD",
    modelName: "Claude-3-Opus",
    sensitivity: "Public",
    status: "error",
    latency: "Timeout (504)",
    action: "Retry Test",
  },
  {
    name: "AutoCategorizer_X",
    id: "SRV-002-PP",
    owner: "Logistics Core",
    environment: "DEV",
    modelName: "Mistral-Large",
    sensitivity: "Internal",
    status: "online",
    latency: "8ms",
    action: "Test Connection",
  },
];

export const registryFeed = [
  "RiskAssessment_v4 connection verified successfully from node EU-WEST-1. Response latency: 12ms.",
  "Scheduled governance audit initiated for NLP Research group. Scan depth: Level 4.",
  "CRITICAL: Registry entry CustomerSentiment_Bot failed availability handshake. Protocol 7 triggered.",
];

export const registryDistribution = [
  { label: "Large Language Models", value: 64, tone: "cyan" },
  { label: "Vision & Synthesis", value: 21, tone: "purple" },
  { label: "Predictive Analytics", value: 15, tone: "amber" },
];