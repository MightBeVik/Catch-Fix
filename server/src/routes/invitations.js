import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";

import { db } from "../../db.js";
import { createHttpError, sendError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";

export const invitationsRouter = Router();

const TOKEN_TTL_HOURS = 72;

function nowIso() {
  return new Date().toISOString();
}

function expiresAt() {
  return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

// Admin: list all invitations
invitationsRouter.get("/", requireRole("Admin"), (_request, response, next) => {
  try {
    const rows = db
      .prepare("SELECT id, email, role, invited_by, expires_at, used_at, created_at FROM invitations ORDER BY created_at DESC")
      .all();
    response.json({ items: rows });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

// Admin: create invitation
invitationsRouter.post("/", requireRole("Admin"), (request, response, next) => {
  try {
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(["Admin", "Maintainer", "Viewer"]).default("Viewer"),
    }).parse(request.body);

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existingUser) {
      throw createHttpError(409, "A user with that email already exists.");
    }

    // Upsert: replace any existing unused invite for this email
    db.prepare("DELETE FROM invitations WHERE email = ? AND used_at IS NULL").run(email.toLowerCase());

    const token = randomBytes(32).toString("hex");
    const row = db.prepare(`
      INSERT INTO invitations (email, role, token, invited_by, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email.toLowerCase(), role, token, request.user?.username || "admin", expiresAt(), nowIso());

    const created = db.prepare("SELECT id, email, role, invited_by, expires_at, created_at FROM invitations WHERE id = ?").get(row.lastInsertRowid);
    response.status(201).json({ ...created, token });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

// Admin: cancel invitation
invitationsRouter.delete("/:id", requireRole("Admin"), (request, response, next) => {
  try {
    const info = db.prepare("DELETE FROM invitations WHERE id = ? AND used_at IS NULL").run(Number(request.params.id));
    if (info.changes === 0) throw createHttpError(404, "Invitation not found or already used.");
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
    next();
  }
});

// Public: validate a token (called when the invited user opens the link)
invitationsRouter.get("/validate/:token", (request, response, next) => {
  try {
    const invite = db
      .prepare("SELECT id, email, role, expires_at, used_at FROM invitations WHERE token = ?")
      .get(request.params.token);

    if (!invite) throw createHttpError(404, "Invalid invitation link.");
    if (invite.used_at) throw createHttpError(410, "This invitation has already been used.");
    if (new Date(invite.expires_at) < new Date()) throw createHttpError(410, "This invitation has expired.");

    response.json({ email: invite.email, role: invite.role });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

// Public: accept invitation — create account
invitationsRouter.post("/accept", (request, response, next) => {
  try {
    const { token, username, password } = z.object({
      token: z.string().min(1),
      username: z.string().min(3).max(40).regex(/^[a-z0-9_.-]+$/, "Username may only contain lowercase letters, numbers, underscores, hyphens, and dots."),
      password: z.string().min(8, "Password must be at least 8 characters."),
    }).parse(request.body);

    const invite = db
      .prepare("SELECT * FROM invitations WHERE token = ?")
      .get(token);

    if (!invite) throw createHttpError(404, "Invalid invitation link.");
    if (invite.used_at) throw createHttpError(410, "This invitation has already been used.");
    if (new Date(invite.expires_at) < new Date()) throw createHttpError(410, "This invitation has expired.");

    const conflict = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username.toLowerCase(), invite.email);
    if (conflict) throw createHttpError(409, "Username already taken.");

    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
      username.toLowerCase(), invite.email, hash, invite.role,
    );

    db.prepare("UPDATE invitations SET used_at = ? WHERE id = ?").run(nowIso(), invite.id);

    response.status(201).json({ ok: true, role: invite.role });
  } catch (error) {
    sendError(response, error);
    next();
  }
});
