import { apiRequest } from "./client";

export function fetchIncidents() {
  return apiRequest("/incidents/");
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