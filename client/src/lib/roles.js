export const DEMO_ROLES = ["Admin", "Maintainer", "Viewer"];
export const DEFAULT_ROLE = "Admin";
const STORAGE_KEY = "catch-fix-demo-role";

export function getStoredRole() {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return DEMO_ROLES.includes(value) ? value : DEFAULT_ROLE;
}

export function setStoredRole(role) {
  window.localStorage.setItem(STORAGE_KEY, DEMO_ROLES.includes(role) ? role : DEFAULT_ROLE);
}

export function canEdit(role) {
  return role === "Admin" || role === "Maintainer";
}

export function isAdmin(role) {
  return role === "Admin";
}