import { appConfig } from "../config.js";
import { createIncident } from "../repositories/incidentsRepository.js";
import { createAuditLogEntry } from "../repositories/auditLogRepository.js";
import { createEvaluation, createMetric, listRecentEvaluations } from "../repositories/monitoringRepository.js";
import { callAnthropic } from "./anthropicService.js";
import { nowIso } from "../lib/time.js";

const piiPatterns = {
  email: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
};

export function evaluateFormatting(text) {
  try {
    JSON.parse(text);
    return {
      category: "formatting_correctness",
      score: 100,
      passed: true,
      result_details: {
        valid_json: true,
        message: "Output parsed as valid JSON.",
      },
    };
  } catch {
    return {
      category: "formatting_correctness",
      score: 0,
      passed: false,
      result_details: {
        valid_json: false,
        message: "Output was not valid JSON.",
      },
    };
  }
}

export function evaluatePolicy(text) {
  const hits = Object.entries(piiPatterns)
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);

  return {
    category: "policy_adherence",
    score: hits.length === 0 ? 100 : 0,
    passed: hits.length === 0,
    result_details: {
      pii_hits: hits,
      message: hits.length === 0 ? "No email or phone patterns detected." : `Detected disallowed patterns: ${hits.join(", ")}`,
    },
  };
}

export async function runEvaluationForService(service, triggeredBy = "manual") {
  const prompt = [
    "Return only JSON.",
    "Provide an object with keys status, summary, and actions.",
    `Service: ${service.name}`,
  ].join("\n");

  const llmResult = await callAnthropic({
    prompt,
    system: "You are producing machine-readable evaluation output for an AI service.",
    model: service.model_name,
    endpoint: service.api_endpoint,
    maxTokens: 200,
  });

  const formatting = evaluateFormatting(llmResult.text);
  const policy = evaluatePolicy(llmResult.text);
  const timestamp = nowIso();

  const evaluations = [formatting, policy].map((evaluation) =>
    createEvaluation({
      service_id: service.id,
      score: evaluation.score,
      category: evaluation.category,
      result_details: {
        ...evaluation.result_details,
        output_preview: llmResult.text.slice(0, 500),
        triggered_by: triggeredBy,
      },
      timestamp,
    })
  );

  const qualityScore = Math.round((formatting.score + policy.score) / 2);
  const errorRate = Number((((2 - evaluations.filter((item) => item.score === 100).length) / 2) * 100).toFixed(2));

  const metric = createMetric({
    service_id: service.id,
    latency_ms: llmResult.latency_ms,
    error_rate: errorRate,
    quality_score: qualityScore,
    timestamp,
  });

  if (qualityScore < appConfig.driftThreshold) {
    const incident = createIncident({
      service_name: service.name,
      severity: qualityScore < 40 ? "critical" : "high",
      symptoms: `Automated evaluation flagged service below threshold (${qualityScore} < ${appConfig.driftThreshold}).`,
      timeline: `Auto-drafted from ${triggeredBy} evaluation at ${timestamp}.`,
      checklist_json: {
        data_issue: false,
        prompt_change: false,
        model_update: false,
        infrastructure_problem: false,
        safety_policy_failure: true,
      },
      approved: false,
      llm_summary: null,
    });

    createAuditLogEntry({
      userRole: triggeredBy === "scheduler" ? "Admin" : "Maintainer",
      action: "draft_incident_created",
      entityType: "incident",
      entityId: incident.id,
      newValue: incident,
    });
  }

  return {
    service,
    metric,
    evaluations,
    quality_score: qualityScore,
    drift_flagged: qualityScore < appConfig.driftThreshold,
  };
}

export async function runScheduledEvaluationForAllServices(services) {
  const results = [];
  for (const service of services) {
    try {
      const result = await runEvaluationForService(service, "scheduler");
      results.push(result);
    } catch (error) {
      createAuditLogEntry({
        userRole: "Admin",
        action: "scheduled_evaluation_failed",
        entityType: "service",
        entityId: service.id,
        newValue: { message: error.message },
      });
    }
  }

  return results;
}

export function buildMonitoringOverview(services, latestMetrics, latestEvaluations) {
  const metricMap = new Map(latestMetrics.map((metric) => [metric.service_id, metric]));
  const evaluationMap = new Map();

  for (const evaluation of latestEvaluations) {
    const bucket = evaluationMap.get(evaluation.service_id) || [];
    bucket.push(evaluation);
    evaluationMap.set(evaluation.service_id, bucket);
  }

  const serviceRows = services.map((service) => {
    const metric = metricMap.get(service.id);
    const evaluations = evaluationMap.get(service.id) || [];
    const qualityScore = metric?.quality_score ?? null;

    return {
      ...service,
      latest_metric: metric,
      latest_evaluations: evaluations,
      drift_flagged: qualityScore !== null ? qualityScore < appConfig.driftThreshold : false,
    };
  });

  const allRecent = listRecentEvaluations(100);
  const avgScore = allRecent.length
    ? Number((allRecent.reduce((sum, row) => sum + row.score, 0) / allRecent.length).toFixed(1))
    : null;

  return {
    threshold: appConfig.driftThreshold,
    stats: {
      total_services: services.length,
      avg_quality_score: avgScore,
      drift_services: serviceRows.filter((service) => service.drift_flagged).length,
    },
    services: serviceRows,
  };
}