import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { ensureDefaultAdmin, healthCheckDatabase, initializeDatabase, seedDemoData } from "../db.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { invitationsRouter } from "./routes/invitations.js";
import { apiRouter } from "./routes/index.js";

dotenv.config();

export function createApp() {
  const app = express();

  initializeDatabase();
  seedDemoData();
  ensureDefaultAdmin();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    healthCheckDatabase();
    response.json({ status: "ok", service: "Overwatch Server" });
  });

  // Public routes — no token required
  app.use("/api/auth", authRouter);
  app.use("/api/invitations/validate", invitationsRouter);
  app.use("/api/invitations/accept", invitationsRouter);

  // All other API routes require a valid JWT
  app.use("/api", requireAuth, apiRouter);

  return app;
}
