import { db } from "../../db.js";
import { nowIso } from "../lib/time.js";

export function listMaintenancePlans() {
  const rows = db.prepare(`SELECT * FROM maintenance_plans ORDER BY created_at DESC, id DESC`).all();
  return rows.map(mapMaintenanceRow);
}

export function listMaintenancePlansByService(serviceId, limit = 10) {
  const rows = db.prepare(`
    SELECT *
    FROM maintenance_plans
    WHERE service_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(serviceId, limit);

  return rows.map(mapMaintenanceRow);
}

export function getMaintenancePlanById(id) {
  const row = db.prepare(`SELECT * FROM maintenance_plans WHERE id = ?`).get(id);
  return mapMaintenanceRow(row);
}

export function createMaintenancePlan(payload) {
  const result = db.prepare(`
    INSERT INTO maintenance_plans (service_id, next_eval_time, risk_level, rollback_plan, validation_steps, approved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.service_id,
    payload.next_eval_time,
    payload.risk_level,
    payload.rollback_plan,
    payload.validation_steps,
    payload.approved ? 1 : 0,
    nowIso(),
  );

  return getMaintenancePlanById(result.lastInsertRowid);
}

export function updateMaintenancePlan(id, payload) {
  db.prepare(`
    UPDATE maintenance_plans
    SET service_id = ?, next_eval_time = ?, risk_level = ?, rollback_plan = ?, validation_steps = ?, approved = ?
    WHERE id = ?
  `).run(
    payload.service_id,
    payload.next_eval_time,
    payload.risk_level,
    payload.rollback_plan,
    payload.validation_steps,
    payload.approved ? 1 : 0,
    id,
  );

  return getMaintenancePlanById(id);
}

export function listMaintenancePlansForExport() {
  return listMaintenancePlans();
}

function mapMaintenanceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    service_id: row.service_id,
    next_eval_time: row.next_eval_time,
    risk_level: row.risk_level,
    rollback_plan: row.rollback_plan,
    validation_steps: row.validation_steps,
    approved: Boolean(row.approved),
    created_at: row.created_at,
  };
}