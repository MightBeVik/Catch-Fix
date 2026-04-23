import { db } from "../../db.js";
import { nowIso } from "../lib/time.js";

export function createAuditLogEntry({ username = "", userRole, action, entityType, entityId, oldValue = null, newValue = null }) {
  const statement = db.prepare(`
    INSERT INTO audit_log (username, user_role, action, entity_type, entity_id, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = nowIso();
  const result = statement.run(
    username,
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

export function listAuditLog({ order = "desc", action, role, startDate, endDate } = {}) {
  const sortDirection = order === "asc" ? "ASC" : "DESC";
  
  let query = `SELECT * FROM audit_log WHERE 1=1`;
  const params = [];

  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  if (role) {
    query += ` AND user_role = ?`;
    params.push(role);
  }
  if (startDate) {
    query += ` AND timestamp >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND timestamp <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY timestamp ${sortDirection}, id ${sortDirection}`;
  
  const rows = db.prepare(query).all(...params);
  return rows.map(deserializeAuditRow);
}

function deserializeAuditRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username || "",
    user_role: row.user_role,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
    timestamp: row.timestamp,
  };
}