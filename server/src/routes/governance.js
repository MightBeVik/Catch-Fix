import { Router } from "express";

import { appConfig } from "../config.js";
import { clearOperationalData, getOperationalCounts, getPolicy, resetAndSeedDemoData, seedDemoData, updatePolicyValue } from "../../db.js";
import { addDays, nowIso } from "../lib/time.js";
import { getEvaluationJobStatus, startEvaluationJob, stopEvaluationJob, triggerEvaluationJobNow } from "../jobs/evaluationJob.js";
import { demoRoles } from "../middleware/role.js";
import { requireRole } from "../middleware/role.js";
import { listAuditLog } from "../repositories/auditLogRepository.js";
import { listIncidentsForExport } from "../repositories/incidentsRepository.js";
import { listMaintenancePlansForExport } from "../repositories/maintenanceRepository.js";
import { listEvaluationsForExport } from "../repositories/monitoringRepository.js";
import { getRuntimeProviderStatus } from "../services/anthropicService.js";

export const governanceRouter = Router();

governanceRouter.get("/roles", (_request, response) => {
  response.json({ roles: demoRoles });
});

governanceRouter.get("/policy", (_request, response) => {
  response.json(getPolicy());
});

governanceRouter.patch("/policy", requireRole("Admin"), (request, response) => {
  const { key, value } = request.body || {};
  if (!key || value === undefined) {
    return response.status(400).json({ error: "Key and value are required." });
  }
  updatePolicyValue(key, value);
  response.json({ ok: true, policy: getPolicy() });
});

governanceRouter.get("/audit-log", (request, response) => {
  const { order, action, role, startDate, endDate } = request.query;
  response.json({ 
    items: listAuditLog({ 
      order: order === "asc" ? "asc" : "desc",
      action,
      role,
      startDate,
      endDate
    }) 
  });
});

governanceRouter.get("/runtime-status", (_request, response) => {
  const runtime = getRuntimeProviderStatus();
  response.json({
    runtime: {
      ...runtime,
      request_timeout_ms: appConfig.anthropicTimeoutMs,
      request_max_retries: appConfig.anthropicMaxRetries,
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
  const endDateStr = request.query.endDate || new Date().toISOString();
  const startDateStr = request.query.startDate || addDays(new Date(endDateStr), -30).toISOString();
  
  const endDate = new Date(endDateStr);
  const startDate = new Date(startDateStr);

  const exportPayload = {
    exported_at: nowIso(),
    date_range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    evaluation_summaries: listEvaluationsForExport(startDate.toISOString(), endDate.toISOString()),
    incidents: listIncidentsForExport({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
    maintenance_actions_taken: listMaintenancePlansForExport({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
    audit_log_entries: listAuditLog({ order: "desc", startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
  };

  const timestamp = endDate.toISOString().replace(/[:.]/g, "-");
  response.setHeader("Content-Disposition", `attachment; filename="compliance_export_${timestamp}.json"`);
  response.json(exportPayload);
});