export const ROLES = ["Admin", "Maintainer", "Viewer"];

const AUTH_KEY = "catch-fix-auth";

export function getStoredAuth() {
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
}

export function setStoredAuth(data) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_KEY);
}

export function getStoredToken() {
  return getStoredAuth()?.token || null;
}

export function canEdit(role) {
  return role === "Admin" || role === "Maintainer";
}

export function isAdmin(role) {
  return role === "Admin";
}
