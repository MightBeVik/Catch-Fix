import { Router } from "express";

import { getRuntimeProviderStatus } from "../services/anthropicService.js";
import { governanceRouter } from "./governance.js";
import { incidentsRouter } from "./incidents.js";
import { maintenanceRouter } from "./maintenance.js";
import { monitoringRouter } from "./monitoring.js";
import { registryRouter } from "./registry.js";
import { usersRouter } from "./users.js";

export const apiRouter = Router();

apiRouter.get("/meta", (_request, response) => {
  const runtime = getRuntimeProviderStatus();
  response.json({
    project: "Overwatch",
    stack: {
      client: "React + Tailwind + Vite",
      server: "Node.js + Express",
      database: "SQLite",
      jobs: "node-cron",
      llm: "Anthropic + OpenAI-compatible + Ollama adapters",
    },
    phase: 2,
    runtime,
  });
});

apiRouter.use("/registry", registryRouter);
apiRouter.use("/monitoring", monitoringRouter);
apiRouter.use("/incidents", incidentsRouter);
apiRouter.use("/maintenance", maintenanceRouter);
apiRouter.use("/governance", governanceRouter);
apiRouter.use("/users", usersRouter);
