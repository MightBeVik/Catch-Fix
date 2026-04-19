import { Router } from "express";
import { z } from "zod";

import { createHttpError, sendError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";
import { createAuditLogEntry } from "../repositories/auditLogRepository.js";
import { createMaintenancePlan, getMaintenancePlanById, listMaintenancePlans, updateMaintenancePlan } from "../repositories/maintenanceRepository.js";
import { getServiceById } from "../repositories/servicesRepository.js";
import { draftRollbackPlan } from "../services/anthropicService.js";

export const maintenanceRouter = Router();

const maintenanceSchema = z.object({
  service_id: z.number().int().positive(),
  next_eval_time: z.string().min(5),
  risk_level: z.enum(["low", "medium", "high"]),
  rollback_plan: z.string().min(5),
  validation_steps: z.string().min(5),
  approved: z.boolean(),
});

maintenanceRouter.get("/plans", (_request, response) => {
  try {
    response.json({ items: listMaintenancePlans() });
  } catch (error) {
    sendError(response, error);
  }
});

maintenanceRouter.post("/plans", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = maintenanceSchema.parse(request.body);
    if (!payload.approved) {
      throw createHttpError(400, "Human approval must be checked before saving a maintenance plan.");
    }
    const service = getServiceById(payload.service_id);
    if (!service) {
      throw createHttpError(404, "Service not found.");
    }
    const plan = createMaintenancePlan(payload);
    createAuditLogEntry({
      userRole: request.userRole,
      action: "maintenance_plan_created",
      entityType: "maintenance_plan",
      entityId: plan.id,
      newValue: plan,
    });
    response.status(201).json(plan);
  } catch (error) {
    sendError(response, error);
  }
});

maintenanceRouter.put("/plans/:id", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = maintenanceSchema.parse(request.body);
    if (!payload.approved) {
      throw createHttpError(400, "Human approval must be checked before saving a maintenance plan.");
    }
    const existing = getMaintenancePlanById(Number(request.params.id));
    if (!existing) {
      throw createHttpError(404, "Maintenance plan not found.");
    }
    const updated = updateMaintenancePlan(Number(request.params.id), payload);
    createAuditLogEntry({
      userRole: request.userRole,
      action: "maintenance_plan_updated",
      entityType: "maintenance_plan",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    });
    response.json(updated);
  } catch (error) {
    sendError(response, error);
  }
});

maintenanceRouter.post("/draft-rollback", requireRole("Admin", "Maintainer"), async (request, response) => {
  try {
    const payload = z.object({
      service_name: z.string().min(2),
      risk_level: z.enum(["low", "medium", "high"]),
      validation_steps: z.string().min(5),
    }).parse(request.body);
    const rollback_plan = await draftRollbackPlan({
      serviceName: payload.service_name,
      riskLevel: payload.risk_level,
      validationSteps: payload.validation_steps,
    });
    response.json({ rollback_plan, review_required: true });
  } catch (error) {
    sendError(response, error);
  }
});