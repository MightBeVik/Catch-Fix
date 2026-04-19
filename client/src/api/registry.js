import { apiRequest } from "./client";

export function fetchServices() {
  return apiRequest("/registry/services");
}

export function createService(payload) {
  return apiRequest("/registry/services", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchServiceOverview(id) {
  return apiRequest(`/registry/services/${id}/overview`);
}

export function updateService(id, payload) {
  return apiRequest(`/registry/services/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteService(id) {
  return apiRequest(`/registry/services/${id}`, { method: "DELETE" });
}

export function testServiceConnection(id, prompt) {
  return apiRequest(`/registry/services/${id}/test-connection`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}