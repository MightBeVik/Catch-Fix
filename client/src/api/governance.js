import { apiRequest, downloadJson } from "./client";

export function fetchRoles() {
  return apiRequest("/governance/roles");
}

export function fetchPolicy() {
  return apiRequest("/governance/policy");
}

export function fetchAuditLog(order = "desc") {
  return apiRequest(`/governance/audit-log?order=${order}`);
}

export function fetchRuntimeStatus() {
  return apiRequest("/governance/runtime-status");
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

export function downloadComplianceExport() {
  return downloadJson("/governance/compliance-export", "compliance_export");
}