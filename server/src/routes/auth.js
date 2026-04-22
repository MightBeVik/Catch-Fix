import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { db } from "../../db.js";
import { appConfig } from "../config.js";
import { createHttpError, sendError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", (request, response, next) => {
  try {
    const { username, password } = request.body || {};
    if (!username || !password) {
      throw createHttpError(400, "Username and password are required.");
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(String(username).trim().toLowerCase());

    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      throw createHttpError(401, "Invalid username or password.");
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      appConfig.jwtSecret,
      { expiresIn: "8h" },
    );

    response.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  const user = db.prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?").get(request.user.id);
  if (!user) {
    return response.status(401).json({ error: "User not found." });
  }
  response.json({ user });
});
