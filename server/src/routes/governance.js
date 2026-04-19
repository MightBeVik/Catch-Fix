import { Router } from "express";

import { appConfig } from "../config.js";
import { clearOperationalData, getOperationalCounts, resetAndSeedDemoData, seedDemoData } from "../../db.js";
import { addDays, nowIso } from "../lib/time.js";
import { getEvaluationJobStatus, startEvaluationJob, stopEvaluationJob, triggerEvaluationJobNow } from "../jobs/evaluationJob.js";
import { demoRoles } from "../middleware/role.js";
import { requireRole } from "../middleware/role.js";
import { listAuditLog } from "../repositories/auditLogRepository.js";
import { listIncidentsForExport } from "../repositories/incidentsRepository.js";
import { listMaintenancePlansForExport } from "../repositories/maintenanceRepository.js";
import { listEvaluationsForExport } from "../repositories/monitoringRepository.js";

export const governanceRouter = Router();

governanceRouter.get("/roles", (_request, response) => {
  response.json({ roles: demoRoles });
});

governanceRouter.get("/policy", (_request, response) => {
  response.json({
    data_stored: [
      "Service registry metadata and endpoints",
      "Evaluation results and derived metrics",
      "Incident records and approved summaries",
      "Maintenance plans and audit log entries",
    ],
    prompts_logged: "Prompts are not retained beyond evaluation and incident workflow result details needed for governance records.",
    llm_routing: "LLM requests are routed from the backend to Anthropic Claude over cloud API calls. API keys never leave the server.",
    retention: "SQLite data is stored locally in the server data directory for this course project and retained until manually removed.",
  });
});

governanceRouter.get("/audit-log", (request, response) => {
  response.json({ items: listAuditLog({ order: request.query.order === "asc" ? "asc" : "desc" }) });
});

governanceRouter.get("/runtime-status", (_request, response) => {
  response.json({
    runtime: {
      anthropic_configured: Boolean(appConfig.anthropicApiKey),
      anthropic_model: appConfig.anthropicModel,
      anthropic_timeout_ms: appConfig.anthropicTimeoutMs,
      anthropic_max_retries: appConfig.anthropicMaxRetries,
      drift_threshold: appConfig.driftThreshold,
      demo_seed_data: String(process.env.DEMO_SEED_DATA ?? "true").toLowerCase() !== "false",
    },
    scheduler: getEvaluationJobStatus(),
    counts: getOperationalCounts(),
  });
});

governanceRouter.post("/admin/reseed-demo-data", requireRole("Admin"), (request, response) => {
  seedDemoData({ force: true });
  response.status(201).json({ ok: true, counts: getOperationalCounts() });
});

governanceRouter.post("/admin/reset-demo-data", requireRole("Admin"), (request, response) => {
  resetAndSeedDemoData({ force: true });
  response.status(201).json({ ok: true, counts: getOperationalCounts() });
});

governanceRouter.post("/admin/clear-data", requireRole("Admin"), (request, response) => {
  clearOperationalData();
  response.status(201).json({ ok: true, counts: getOperationalCounts() });
});

governanceRouter.post("/admin/run-evaluation-cycle", requireRole("Admin"), async (_request, response, next) => {
  try {
    const scheduler = await triggerEvaluationJobNow("admin_console");
    response.status(201).json({ ok: true, scheduler, counts: getOperationalCounts() });
  } catch (error) {
    next(error);
  }
});

governanceRouter.post("/admin/scheduler", requireRole("Admin"), (request, response) => {
  const action = request.body?.action;
  if (action === "pause") {
    stopEvaluationJob();
  } else if (action === "resume") {
    startEvaluationJob();
  }

  response.status(201).json({ ok: true, scheduler: getEvaluationJobStatus() });
});

governanceRouter.get("/compliance-export", (request, response) => {
  const endDate = new Date();
  const startDate = addDays(endDate, -30);
  const exportPayload = {
    exported_at: nowIso(),
    date_range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    evaluation_summaries: listEvaluationsForExport(startDate.toISOString()),
    incidents: listIncidentsForExport(),
    maintenance_actions_taken: listMaintenancePlansForExport(),
    audit_log_entries: listAuditLog({ order: "desc" }),
  };

  const timestamp = endDate.toISOString().replace(/[:.]/g, "-");
  response.setHeader("Content-Disposition", `attachment; filename=\"compliance_export_${timestamp}.json\"`);
  response.json(exportPayload);
});