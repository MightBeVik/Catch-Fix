import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";

import { db } from "../../db.js";
import { createHttpError, sendError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";

export const usersRouter = Router();

const createUserSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9_.-]+$/, "Username may only contain lowercase letters, numbers, underscores, hyphens, and dots."),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["Admin", "Maintainer", "Viewer"]).default("Viewer"),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

usersRouter.get("/", requireRole("Admin"), (_request, response, next) => {
  try {
    const users = db
      .prepare("SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC")
      .all();
    response.json({ items: users });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

usersRouter.post("/", requireRole("Admin"), (request, response, next) => {
  try {
    const payload = createUserSchema.parse(request.body);

    const conflict = db
      .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
      .get(payload.username.toLowerCase(), payload.email.toLowerCase());
    if (conflict) {
      throw createHttpError(409, "A user with that username or email already exists.");
    }

    const hash = bcrypt.hashSync(payload.password, 10);
    const result = db
      .prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(payload.username.toLowerCase(), payload.email.toLowerCase(), hash, payload.role);

    const created = db
      .prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?")
      .get(result.lastInsertRowid);
    response.status(201).json(created);
  } catch (error) {
    sendError(response, error);
    next();
  }
});

usersRouter.patch("/:id/password", requireRole("Admin"), (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id) {
      throw createHttpError(400, "Use the profile endpoint to change your own password.");
    }
    const { password } = updatePasswordSchema.parse(request.body);
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
    if (info.changes === 0) throw createHttpError(404, "User not found.");
    response.json({ ok: true });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

usersRouter.delete("/:id", requireRole("Admin"), (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id) {
      throw createHttpError(400, "You cannot delete your own account.");
    }
    const total = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
    if (total <= 1) {
      throw createHttpError(400, "Cannot delete the last user account.");
    }
    const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    if (info.changes === 0) throw createHttpError(404, "User not found.");
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
    next();
  }
});
