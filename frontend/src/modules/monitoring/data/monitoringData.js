/**
 * Monitoring module API client.
 * Fetches all data from the FastAPI backend.
 */

const BASE = "/api/monitoring";

export async function fetchDashboard() {
  const res = await fetch(`${BASE}/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function runEval(serviceId) {
  const res = await fetch(`${BASE}/eval/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: serviceId, triggered_by: "manual" }),
  });
  if (!res.ok) throw new Error("Eval run failed");
  return res.json();
}

export async function fetchEvalResults() {
  const res = await fetch(`${BASE}/eval/results`);
  if (!res.ok) throw new Error("Failed to fetch eval results");
  return res.json();
}