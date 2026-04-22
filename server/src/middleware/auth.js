import jwt from "jsonwebtoken";

import { appConfig } from "../config.js";
import { createHttpError } from "../lib/httpError.js";

export function requireAuth(request, response, next) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(createHttpError(401, "Authentication required."));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, appConfig.jwtSecret);
    request.user = { id: payload.sub, username: payload.username, role: payload.role };
    request.userRole = payload.role;
    next();
  } catch {
    next(createHttpError(401, "Invalid or expired token."));
  }
}
