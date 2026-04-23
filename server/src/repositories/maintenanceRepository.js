import { db } from "../../db.js";
import { nowIso } from "../lib/time.js";

export function listMaintenancePlans({ includeArchived = false } = {}) {
  const rows = includeArchived
    ? db.prepare(`SELECT * FROM maintenance_plans ORDER BY created_at DESC, id DESC`).all()
    : db.prepare(`SELECT * FROM maintenance_plans WHERE status NOT IN ('completed', 'cancelled') ORDER BY created_at DESC, id DESC`).all();
  return rows.map(mapMaintenanceRow);
}

export function listDueApprovedPlans() {
  const rows = db.prepare(`
    SELECT * FROM maintenance_plans
    WHERE status = 'approved' AND next_eval_time <= ?
  `).all(nowIso());
  return rows.map(mapMaintenanceRow);
}

export function approvePlan(id) {
  const existing = getMaintenancePlanById(id);
  if (!existing || existing.status !== "pending") return null;
  db.prepare(`UPDATE maintenance_plans SET status = 'approved', approved = 1 WHERE id = ?`).run(id);
  return getMaintenancePlanById(id);
}

export function completePlan(id) {
  const existing = getMaintenancePlanById(id);
  if (!existing || existing.status !== "approved") return null;
  db.prepare(`UPDATE maintenance_plans SET status = 'completed', completed_at = ? WHERE id = ?`).run(nowIso(), id);
  return getMaintenancePlanById(id);
}

export function cancelPlan(id) {
  const existing = getMaintenancePlanById(id);
  if (!existing || existing.status === "completed") return null;
  db.prepare(`UPDATE maintenance_plans SET status = 'cancelled', completed_at = ? WHERE id = ?`).run(nowIso(), id);
  return getMaintenancePlanById(id);
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
    INSERT INTO maintenance_plans (service_id, next_eval_time, risk_level, rollback_plan, validation_steps, approved, status, eval_mode, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)
  `).run(
    payload.service_id,
    payload.next_eval_time,
    payload.risk_level,
    payload.rollback_plan,
    payload.validation_steps,
    payload.eval_mode || "full",
    nowIso(),
  );

  return getMaintenancePlanById(result.lastInsertRowid);
}

export function updateMaintenancePlan(id, payload) {
  const existing = getMaintenancePlanById(id);
  if (!existing || existing.status === "completed" || existing.status === "cancelled") return existing;
  db.prepare(`
    UPDATE maintenance_plans
    SET service_id = ?, next_eval_time = ?, risk_level = ?, rollback_plan = ?, validation_steps = ?, eval_mode = ?
    WHERE id = ?
  `).run(
    payload.service_id,
    payload.next_eval_time,
    payload.risk_level,
    payload.rollback_plan,
    payload.validation_steps,
    payload.eval_mode || "full",
    id,
  );

  return getMaintenancePlanById(id);
}

export function listMaintenancePlansForExport() {
  return listMaintenancePlans();
}

function mapMaintenanceRow(row) {
  if (!row) return null;
  const status = row.status || (row.approved ? "approved" : "pending");
  return {
    id: row.id,
    service_id: row.service_id,
    next_eval_time: row.next_eval_time,
    risk_level: row.risk_level,
    rollback_plan: row.rollback_plan,
    validation_steps: row.validation_steps,
    approved: Boolean(row.approved),
    status,
    eval_mode: row.eval_mode || "full",
    completed_at: row.completed_at || null,
    created_at: row.created_at,
  };
}