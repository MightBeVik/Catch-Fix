import { apiRequest } from "./client";

export async function loginRequest(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Login failed");
  }
  return payload; // { token, user }
}

async function postPublic(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || "Request failed");
  }
  return body;
}

export function recoverUsername(email) {
  return postPublic("/api/auth/recover-username", { email });
}

export function requestPasswordReset(username, email) {
  return postPublic("/api/auth/request-password-reset", { username, email });
}

export async function getPasswordResetStatus(token) {
  const response = await fetch(`/api/auth/password-reset/${token}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Invalid reset link");
  }
  return payload;
}

export function confirmPasswordReset(token, password) {
  return postPublic("/api/auth/password-reset/confirm", { token, password });
}

export function updateProfileEmail(email) {
  return apiRequest("/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export function updateProfilePassword(currentPassword, newPassword) {
  return apiRequest("/auth/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
