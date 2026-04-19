import { db } from "../../db.js";
import { nowIso } from "../lib/time.js";

export function createAuditLogEntry({ userRole, action, entityType, entityId, oldValue = null, newValue = null }) {
  const statement = db.prepare(`
    INSERT INTO audit_log (user_role, action, entity_type, entity_id, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = nowIso();
  const result = statement.run(
    userRole,
    action,
    entityType,
    String(entityId),
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    timestamp,
  );

  return getAuditLogEntryById(result.lastInsertRowid);
}

export function getAuditLogEntryById(id) {
  const row = db.prepare(`SELECT * FROM audit_log WHERE id = ?`).get(id);
  return deserializeAuditRow(row);
}

export function listAuditLog({ order = "desc" } = {}) {
  const sortDirection = order === "asc" ? "ASC" : "DESC";
  const rows = db.prepare(`SELECT * FROM audit_log ORDER BY timestamp ${sortDirection}, id ${sortDirection}`).all();
  return rows.map(deserializeAuditRow);
}

function deserializeAuditRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_role: row.user_role,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
    timestamp: row.timestamp,
  };
}