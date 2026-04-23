import { apiRequest, downloadJson } from "./client";

export function fetchPolicy() {
  return apiRequest("/governance/policy");
}

export function updatePolicy(key, value) {
  return apiRequest("/governance/policy", {
    method: "PATCH",
    body: JSON.stringify({ key, value }),
  });
}

export function fetchAuditLog(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/governance/audit-log?${query}`);
}

export function reseedDemoData() {
  return apiRequest("/governance/admin/reseed-demo-data", { method: "POST" });
}

export function resetDemoData() {
  return apiRequest("/governance/admin/reset-demo-data", { method: "POST" });
}

export function clearOperationalData() {
  return apiRequest("/governance/admin/clear-data", { method: "POST" });
}

export function runEvaluationCycle() {
  return apiRequest("/governance/admin/run-evaluation-cycle", { method: "POST" });
}

export function setSchedulerState(action) {
  return apiRequest("/governance/admin/scheduler", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function downloadComplianceExport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return downloadJson(`/governance/compliance-export?${query}`, "compliance_export");
}