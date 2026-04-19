import { apiRequest } from "./client";

export function fetchDashboard() {
  return apiRequest("/monitoring/dashboard");
}

export function fetchEvaluations() {
  return apiRequest("/monitoring/evaluations");
}

export function runEvaluation(serviceId) {
  return apiRequest("/monitoring/evaluations/run", {
    method: "POST",
    body: JSON.stringify({ service_id: serviceId }),
  });
}