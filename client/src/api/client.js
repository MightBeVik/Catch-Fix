import { getStoredRole } from "../lib/roles";

async function readResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Request failed");
  }
  return payload;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("x-demo-role", getStoredRole());
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  return readResponse(response);
}

export function fetchMeta() {
  return apiRequest("/meta");
}

export async function downloadJson(path, filenamePrefix) {
  const headers = new Headers({ "x-demo-role": getStoredRole() });
  const response = await fetch(`/api${path}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Download failed");
  }
  const data = await response.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  window.URL.revokeObjectURL(url);
  return data;
}