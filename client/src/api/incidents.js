import { apiRequest } from "./client";

export function fetchIncidents({ includeResolved = false } = {}) {
  return apiRequest(`/incidents/${includeResolved ? "?include_resolved=true" : ""}`);
}

export function resolveIncident(id) {
  return apiRequest(`/incidents/${id}/resolve`, { method: "POST" });
}

export function createIncident(payload) {
  return apiRequest("/incidents/", { method: "POST", body: JSON.stringify(payload) });
}

export function generateIncidentSummary(id) {
  return apiRequest(`/incidents/${id}/generate-summary`, { method: "POST" });
}

export function approveIncidentSummary(id, llmSummary) {
  return apiRequest(`/incidents/${id}/approve-summary`, {
    method: "POST",
    body: JSON.stringify({ llm_summary: llmSummary }),
  });
}