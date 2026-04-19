import { Router } from "express";

import { appConfig } from "../config.js";
import { governanceRouter } from "./governance.js";
import { incidentsRouter } from "./incidents.js";
import { maintenanceRouter } from "./maintenance.js";
import { monitoringRouter } from "./monitoring.js";
import { registryRouter } from "./registry.js";

export const apiRouter = Router();

apiRouter.get("/meta", (_request, response) => {
  response.json({
    project: "Catch-Fix",
    stack: {
      client: "React + Tailwind + Vite",
      server: "Node.js + Express",
      database: "SQLite",
      jobs: "node-cron",
      llm: "Anthropic Claude REST"
    },
    phase: 2,
    runtime: {
      anthropic_configured: Boolean(appConfig.anthropicApiKey),
      anthropic_model: appConfig.anthropicModel,
    },
  });
});

apiRouter.use("/registry", registryRouter);
apiRouter.use("/monitoring", monitoringRouter);
apiRouter.use("/incidents", incidentsRouter);
apiRouter.use("/maintenance", maintenanceRouter);
apiRouter.use("/governance", governanceRouter);