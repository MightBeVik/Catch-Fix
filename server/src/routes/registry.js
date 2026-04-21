import { Router } from "express";
import { z } from "zod";

import { createHttpError, sendError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";
import { createAuditLogEntry } from "../repositories/auditLogRepository.js";
import { listIncidentsByServiceName } from "../repositories/incidentsRepository.js";
import { listMaintenancePlansByService } from "../repositories/maintenanceRepository.js";
import { listRecentEvaluationsForService, listRecentMetricsForService } from "../repositories/monitoringRepository.js";
import { createService, deleteService, getServiceById, listServices, updateService } from "../repositories/servicesRepository.js";
import { decorateServiceConnectionStatus, testServiceConnection } from "../services/anthropicService.js";

export const registryRouter = Router();

const serviceSchema = z.object({
  name: z.string().min(2),
  owner: z.string().min(2),
  environment: z.enum(["dev", "prod"]),
  provider_type: z.enum(["anthropic", "openai-compatible", "ollama"]).default("anthropic"),
  model_name: z.string().min(2),
  sensitivity: z.enum(["public", "internal", "confidential"]),
  api_endpoint: z.string().url(),
  api_key_env_var: z.string().max(100).optional().transform((value) => (value || "").trim()),
});

registryRouter.get("/services", (_request, response) => {
  response.json({ items: listServices().map(decorateServiceConnectionStatus) });
});

registryRouter.get("/services/:id", (request, response, next) => {
  try {
    const service = getServiceById(Number(request.params.id));
    if (!service) {
      throw createHttpError(404, "Service not found.");
    }
    response.json(decorateServiceConnectionStatus(service));
  } catch (error) {
    sendError(response, error);
    next();
  }
});

registryRouter.get("/services/:id/overview", (request, response, next) => {
  try {
    const service = getServiceById(Number(request.params.id));
    if (!service) {
      throw createHttpError(404, "Service not found.");
    }

    const metrics = listRecentMetricsForService(service.id, 8);
    const evaluations = listRecentEvaluationsForService(service.id, 8);
    const incidents = listIncidentsByServiceName(service.name, 8);
    const maintenancePlans = listMaintenancePlansByService(service.id, 8);

    response.json({
      service: decorateServiceConnectionStatus(service),
      metrics,
      evaluations,
      incidents,
      maintenance_plans: maintenancePlans,
      summary: {
        incident_count: incidents.length,
        approved_incident_count: incidents.filter((incident) => incident.approved).length,
        pending_maintenance_count: maintenancePlans.filter((plan) => !plan.approved).length,
        latest_quality_score: metrics[0]?.quality_score ?? null,
      },
    });
  } catch (error) {
    sendError(response, error);
    next();
  }
});

registryRouter.post("/services", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = serviceSchema.parse(request.body);
    const service = createService(payload);
    createAuditLogEntry({
      userRole: request.userRole,
      action: "service_created",
      entityType: "service",
      entityId: service.id,
      newValue: service,
    });
    response.status(201).json(service);
  } catch (error) {
    sendError(response, error);
  }
});

registryRouter.put("/services/:id", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = serviceSchema.parse(request.body);
    const id = Number(request.params.id);
    const existing = getServiceById(id);
    if (!existing) {
      throw createHttpError(404, "Service not found.");
    }
    const updated = updateService(id, payload);
    createAuditLogEntry({
      userRole: request.userRole,
      action: "service_updated",
      entityType: "service",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });
    response.json(updated);
  } catch (error) {
    sendError(response, error);
  }
});

registryRouter.delete("/services/:id", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const removed = deleteService(Number(request.params.id));
    if (!removed) {
      throw createHttpError(404, "Service not found.");
    }
    createAuditLogEntry({
      userRole: request.userRole,
      action: "service_deleted",
      entityType: "service",
      entityId: removed.id,
      oldValue: removed,
    });
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
  }
});

registryRouter.post("/services/:id/test-connection", requireRole("Admin", "Maintainer"), async (request, response) => {
  try {
    const service = getServiceById(Number(request.params.id));
    if (!service) {
      throw createHttpError(404, "Service not found.");
    }
    const result = await testServiceConnection(service, request.body?.prompt || "Reply with the single word PONG.");
    createAuditLogEntry({
      userRole: request.userRole,
      action: "service_connection_tested",
      entityType: "service",
      entityId: service.id,
      newValue: result,
    });
    response.json({ service: decorateServiceConnectionStatus(service), test_result: result });
  } catch (error) {
    sendError(response, error);
  }
});