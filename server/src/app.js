import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    response.json({
      status: "ok",
      service: "Overwatch Server",
      version: "3",
      smtp: {
        host: process.env.SMTP_HOST || null,
        port: process.env.SMTP_PORT || null,
        user: process.env.SMTP_USER || null,
        from_email: process.env.SMTP_FROM_EMAIL || null,
        enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL),
      },
    });
  });

  // Public routes — no token required
  app.use("/api/auth", authRouter);
  app.use("/api/invitations", invitationsRouter);

  // All other API routes require a valid JWT
  app.use("/api", requireAuth, apiRouter);

  // Serve built client in production
  const clientDist = join(__dirname, "../../client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => res.sendFile(join(clientDist, "index.html")));
  }

  return app;
}
