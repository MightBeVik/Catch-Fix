import { db } from "../../db.js";
import { nowIso } from "../lib/time.js";

export function listIncidents() {
  const rows = db.prepare(`SELECT * FROM incidents ORDER BY updated_at DESC, id DESC`).all();
  return rows.map(mapIncidentRow);
}

export function listIncidentsByServiceName(serviceName, limit = 10) {
  const rows = db.prepare(`
    SELECT *
    FROM incidents
    WHERE service_name = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT ?
  `).all(serviceName, limit);

  return rows.map(mapIncidentRow);
}

export function getIncidentById(id) {
  const row = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id);
  return mapIncidentRow(row);
}

export function createIncident(payload) {
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO incidents (service_name, severity, symptoms, timeline, checklist_json, llm_summary, approved, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.service_name,
    payload.severity,
    payload.symptoms,
    payload.timeline,
    JSON.stringify(payload.checklist_json),
    payload.llm_summary || null,
    payload.approved ? 1 : 0,
    timestamp,
    timestamp,
  );

  return getIncidentById(result.lastInsertRowid);
}

export function updateIncident(id, payload) {
  const existing = getIncidentById(id);
  if (!existing) {
    return null;
  }

  db.prepare(`
    UPDATE incidents
    SET service_name = ?, severity = ?, symptoms = ?, timeline = ?, checklist_json = ?, llm_summary = ?, approved = ?, updated_at = ?
    WHERE id = ?
  `).run(
    payload.service_name,
    payload.severity,
    payload.symptoms,
    payload.timeline,
    JSON.stringify(payload.checklist_json),
    payload.llm_summary || null,
    payload.approved ? 1 : 0,
    nowIso(),
    id,
  );

  return getIncidentById(id);
}

export function saveIncidentSummary(id, llmSummary) {
  const existing = getIncidentById(id);
  if (!existing) {
    return null;
  }

  db.prepare(`UPDATE incidents SET llm_summary = ?, approved = 1, updated_at = ? WHERE id = ?`).run(llmSummary, nowIso(), id);
  return getIncidentById(id);
}

export function listIncidentsForExport() {
  return listIncidents();
}

function mapIncidentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    service_name: row.service_name,
    severity: row.severity,
    symptoms: row.symptoms,
    timeline: row.timeline,
    checklist_json: JSON.parse(row.checklist_json),
    llm_summary: row.llm_summary,
    approved: Boolean(row.approved),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}