import { Router } from "express";
import { z } from "zod";

import { sendError, createHttpError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";
import { createAuditLogEntry } from "../repositories/auditLogRepository.js";
import { listLatestEvaluationSummaryByService, listLatestMetricsByService, listRecentEvaluations } from "../repositories/monitoringRepository.js";
import { getServiceById, listServices } from "../repositories/servicesRepository.js";
import { buildMonitoringOverview, runEvaluationForService } from "../services/evaluationService.js";

export const monitoringRouter = Router();

const runSchema = z.object({
  service_id: z.number().int().positive().optional(),
});

monitoringRouter.get("/dashboard", (_request, response) => {
  try {
    const data = buildMonitoringOverview(
      listServices(),
      listLatestMetricsByService(),
      listLatestEvaluationSummaryByService(),
    );
    response.json(data);
  } catch (error) {
    sendError(response, error);
  }
});

monitoringRouter.get("/evaluations", (_request, response) => {
  try {
    response.json({ items: listRecentEvaluations(100) });
  } catch (error) {
    sendError(response, error);
  }
});

monitoringRouter.post("/evaluations/run", requireRole("Admin", "Maintainer"), async (request, response) => {
  try {
    const payload = runSchema.parse(request.body || {});
    if (!payload.service_id) {
      throw createHttpError(400, "service_id is required for manual runs.");
    }

    const service = getServiceById(payload.service_id);
    if (!service) {
      throw createHttpError(404, "Service not found.");
    }

    const result = await runEvaluationForService(service, "manual");
    createAuditLogEntry({
      userRole: request.userRole,
      action: "evaluation_run",
      entityType: "evaluation",
      entityId: service.id,
      newValue: result,
    });
    response.status(201).json(result);
  } catch (error) {
    sendError(response, error);
  }
});