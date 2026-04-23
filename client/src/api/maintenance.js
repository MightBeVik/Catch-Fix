import { apiRequest } from "./client";

export function fetchMaintenancePlans({ includeArchived = false } = {}) {
  return apiRequest(`/maintenance/plans${includeArchived ? "?include_archived=true" : ""}`);
}

export function approvePlan(id) {
  return apiRequest(`/maintenance/plans/${id}/approve`, { method: "POST" });
}

export function completePlan(id) {
  return apiRequest(`/maintenance/plans/${id}/complete`, { method: "POST" });
}

export function cancelPlan(id) {
  return apiRequest(`/maintenance/plans/${id}/cancel`, { method: "POST" });
}

export function createMaintenancePlan(payload) {
  return apiRequest("/maintenance/plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateMaintenancePlan(id, payload) {
  return apiRequest(`/maintenance/plans/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function draftRollbackPlan(payload) {
  return apiRequest("/maintenance/draft-rollback", { method: "POST", body: JSON.stringify(payload) });
}