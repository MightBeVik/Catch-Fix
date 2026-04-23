import { Router } from "express";
import { z } from "zod";

import { createHttpError, sendError } from "../lib/httpError.js";
import { requireRole } from "../middleware/role.js";
import { createAuditLogEntry } from "../repositories/auditLogRepository.js";
import { createIncident, getIncidentById, listIncidents, resolveIncident, saveIncidentSummary, updateIncident } from "../repositories/incidentsRepository.js";
import { getServiceByName } from "../repositories/servicesRepository.js";
import { draftIncidentSummary } from "../services/anthropicService.js";

export const incidentsRouter = Router();

const checklistSchema = z.object({
  data_issue: z.boolean(),
  prompt_change: z.boolean(),
  model_update: z.boolean(),
  infrastructure_problem: z.boolean(),
  safety_policy_failure: z.boolean(),
});

const incidentSchema = z.object({
  service_name: z.string().min(2),
  severity: z.enum(["low", "medium", "high", "critical"]),
  symptoms: z.string().min(5),
  timeline: z.string().min(5),
  checklist_json: checklistSchema,
  llm_summary: z.string().nullable().optional(),
  approved: z.boolean().default(false),
});

incidentsRouter.get("/", (request, response) => {
  try {
    const includeResolved = request.query.include_resolved === "true";
    response.json({ items: listIncidents({ includeResolved }) });
  } catch (error) {
    sendError(response, error);
  }
});

incidentsRouter.post("/", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = incidentSchema.parse(request.body);
    const incident = createIncident(payload);
    createAuditLogEntry({
      username: request.user?.username || "",
      userRole: request.userRole,
      action: "incident_created",
      entityType: "incident",
      entityId: incident.id,
      newValue: incident,
    });
    response.status(201).json(incident);
  } catch (error) {
    sendError(response, error);
  }
});

incidentsRouter.put("/:id", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const payload = incidentSchema.parse(request.body);
    const id = Number(request.params.id);
    const existing = getIncidentById(id);
    if (!existing) {
      throw createHttpError(404, "Incident not found.");
    }
    const updated = updateIncident(id, payload);
    createAuditLogEntry({
      username: request.user?.username || "",
      userRole: request.userRole,
      action: "incident_updated",
      entityType: "incident",
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    response.json(updated);
  } catch (error) {
    sendError(response, error);
  }
});

incidentsRouter.post("/:id/generate-summary", requireRole("Admin", "Maintainer"), async (request, response) => {
  try {
    const incident = getIncidentById(Number(request.params.id));
    if (!incident) {
      throw createHttpError(404, "Incident not found.");
    }
    const service = getServiceByName(incident.service_name);
    const summary = await draftIncidentSummary({
      service,
      serviceName: incident.service_name,
      severity: incident.severity,
      symptoms: incident.symptoms,
      timeline: incident.timeline,
      checklist: incident.checklist_json,
    });
    response.json({
      incident_id: incident.id,
      draft_summary: summary,
      review_required: true,
    });
  } catch (error) {
    sendError(response, error);
  }
});

incidentsRouter.post("/:id/resolve", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const incident = resolveIncident(Number(request.params.id));
    if (!incident) {
      throw createHttpError(404, "Incident not found or not yet approved.");
    }
    createAuditLogEntry({
      username: request.user?.username || "",
      userRole: request.userRole,
      action: "incident_resolved",
      entityType: "incident",
      entityId: incident.id,
      newValue: incident,
    });
    response.json(incident);
  } catch (error) {
    sendError(response, error);
  }
});

incidentsRouter.post("/:id/approve-summary", requireRole("Admin", "Maintainer"), (request, response) => {
  try {
    const summary = z.object({ llm_summary: z.string().min(10) }).parse(request.body);
    const incident = saveIncidentSummary(Number(request.params.id), summary.llm_summary);
    if (!incident) {
      throw createHttpError(404, "Incident not found.");
    }
    createAuditLogEntry({
      username: request.user?.username || "",
      userRole: request.userRole,
      action: "incident_summary_approved",
      entityType: "incident",
      entityId: incident.id,
      newValue: incident,
    });
    response.json(incident);
  } catch (error) {
    sendError(response, error);
  }
});