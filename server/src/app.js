import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { healthCheckDatabase, initializeDatabase, seedDemoData } from "../db.js";
import { attachDemoRole } from "./middleware/role.js";
import { apiRouter } from "./routes/index.js";

dotenv.config();

export function createApp() {
  const app = express();

  initializeDatabase();
  seedDemoData();

  app.use(cors());
  app.use(express.json());
  app.use(attachDemoRole);

  app.get("/health", (_request, response) => {
    healthCheckDatabase();
    response.json({ status: "ok", service: "Catch-Fix Server" });
  });

  app.use("/api", apiRouter);

  return app;
}