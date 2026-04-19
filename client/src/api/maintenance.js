import { apiRequest } from "./client";

export function fetchMaintenancePlans() {
  return apiRequest("/maintenance/plans");
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