const REGISTRY_BASE_URL = "/api/registry";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.detail ?? "Registry request failed.";
    throw new Error(message);
  }

  return payload;
}

export async function fetchRegistrySummary() {
  const response = await fetch(`${REGISTRY_BASE_URL}/summary`);
  return readJson(response);
}

export async function fetchRegistryServices() {
  const response = await fetch(`${REGISTRY_BASE_URL}/services`);
  return readJson(response);
}

export async function fetchRegistryService(serviceId) {
  const response = await fetch(`${REGISTRY_BASE_URL}/services/${serviceId}`);
  return readJson(response);
}

export async function createRegistryService(payload) {
  const response = await fetch(`${REGISTRY_BASE_URL}/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJson(response);
}

export async function testRegistryService(serviceId, prompt = "Reply with the single word PONG.") {
  const response = await fetch(`${REGISTRY_BASE_URL}/services/${serviceId}/test-connection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  return readJson(response);
}