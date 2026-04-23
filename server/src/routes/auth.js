import bcrypt from "bcryptjs";
import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { db } from "../../db.js";
import { appConfig } from "../config.js";
import { createHttpError, sendError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

export const authRouter = Router();

const recoverUsernameSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const requestPasswordResetSchema = z.object({
  username: z.string().min(1, "Username is required."),
  email: z.string().trim().optional().default("").refine((value) => !value || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address.",
  }),
});

const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const updateProfileSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const updateUserPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

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

authRouter.post("/recover-username", (request, response, next) => {
  try {
    const { email } = recoverUsernameSchema.parse(request.body || {});
    const user = db
      .prepare("SELECT username FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());

    if (!user) {
      throw createHttpError(404, "No account was found for that email address.");
    }

    response.json({
      username: user.username,
      message: "We found your username.",
    });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

authRouter.post("/request-password-reset", async (request, response, next) => {
  try {
    const { username, email } = requestPasswordResetSchema.parse(request.body || {});
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const user = db
      .prepare("SELECT id, username, email, role FROM users WHERE username = ?")
      .get(normalizedUsername);

    if (!user) throw createHttpError(404, "We couldn't find that account.");

    if (user.email !== normalizedEmail) {
      throw createHttpError(404, "We couldn't match that username and email combination.");
    }

    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ? OR used_at IS NOT NULL")
      .run(user.id, nowIso());

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = minutesFromNowIso(30);
    db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, token, expiresAt, nowIso());

    const resetPath = `/reset-password?token=${token}`;
    const resetUrl = new URL(resetPath, appConfig.passwordResetBaseUrl).toString();

    if (appConfig.recoveryEmailEnabled) {
      await sendPasswordResetEmail({ to: user.email, username: user.username, resetUrl, expiresAt });
      response.json({
        delivery: "email",
        expiresAt,
        message: `Password reset instructions were sent to ${user.email}.`,
      });
      return;
    }

    response.json({
      delivery: "link",
      resetPath,
      expiresAt,
      message: "Reset link generated.",
    });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

authRouter.get("/password-reset/:token", (request, response, next) => {
  try {
    const record = getResetTokenRecord(request.params.token);
    response.json({
      username: record.username,
      email: record.email,
      expiresAt: record.expires_at,
    });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

authRouter.post("/password-reset/confirm", (request, response, next) => {
  try {
    const { token, password } = confirmPasswordResetSchema.parse(request.body || {});
    const record = getResetTokenRecord(token);
    const hash = bcrypt.hashSync(password, 10);

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, record.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(nowIso(), record.id);

    response.json({ ok: true });
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

authRouter.patch("/me", requireAuth, (request, response, next) => {
  try {
    const { email } = updateProfileSchema.parse(request.body || {});
    const normalizedEmail = email.trim().toLowerCase();
    const conflict = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(normalizedEmail, request.user.id);

    if (conflict) {
      throw createHttpError(409, "That email is already in use by another account.");
    }

    const info = db
      .prepare("UPDATE users SET email = ? WHERE id = ?")
      .run(normalizedEmail, request.user.id);
    if (info.changes === 0) {
      throw createHttpError(404, "User not found.");
    }

    const user = db
      .prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?")
      .get(request.user.id);

    response.json({ user });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

authRouter.patch("/me/password", requireAuth, (request, response, next) => {
  try {
    const { currentPassword, newPassword } = updateUserPasswordSchema.parse(request.body || {});
    
    const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(request.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      throw createHttpError(401, "Incorrect current password.");
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    const info = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, request.user.id);
    
    if (info.changes === 0) {
      throw createHttpError(404, "User not found.");
    }
    
    response.json({ ok: true });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

function getResetTokenRecord(token) {
  const record = db.prepare(`
    SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.username, u.email
    FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token = ?
  `).get(String(token));

  if (!record) {
    throw createHttpError(404, "Invalid password reset link.");
  }
  if (record.used_at) {
    throw createHttpError(410, "This password reset link has already been used.");
  }
  if (new Date(record.expires_at) < new Date()) {
    throw createHttpError(410, "This password reset link has expired.");
  }

  return record;
}

function nowIso() {
  return new Date().toISOString();
}

function minutesFromNowIso(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
