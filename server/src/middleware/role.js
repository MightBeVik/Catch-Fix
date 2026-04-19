import { createHttpError } from "../lib/httpError.js";

export const demoRoles = ["Admin", "Maintainer", "Viewer"];

export function normalizeRole(role) {
  const match = demoRoles.find((candidate) => candidate.toLowerCase() === String(role || "Viewer").toLowerCase());
  return match || "Viewer";
}

export function attachDemoRole(request, _response, next) {
  const requestedRole = request.header("x-demo-role") || request.query.role || "Viewer";
  request.userRole = normalizeRole(requestedRole);
  next();
}

export function requireRole(...allowedRoles) {
  return (request, _response, next) => {
    const currentRole = request.userRole || "Viewer";
    if (!allowedRoles.includes(currentRole)) {
      next(createHttpError(403, `Role ${currentRole} cannot perform this action.`));
      return;
    }
    next();
  };
}