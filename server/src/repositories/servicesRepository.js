import { db } from "../../db.js";

export function listServices() {
  const rows = db.prepare(`SELECT * FROM services ORDER BY created_at DESC, id DESC`).all();
  return rows.map(mapServiceRow);
}

export function getServiceById(id) {
  const row = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id);
  return mapServiceRow(row);
}

export function getServiceByName(name) {
  const row = db.prepare(`SELECT * FROM services WHERE name = ?`).get(name);
  return mapServiceRow(row);
}

export function createService(payload) {
  const statement = db.prepare(`
    INSERT INTO services (name, owner, environment, provider_type, model_name, sensitivity, api_endpoint, api_key_env_var, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    payload.name,
    payload.owner,
    payload.environment,
    payload.provider_type,
    payload.model_name,
    payload.sensitivity,
    payload.api_endpoint,
    payload.api_key_env_var || null,
    new Date().toISOString(),
  );

  return getServiceById(result.lastInsertRowid);
}

export function updateService(id, payload) {
  db.prepare(`
    UPDATE services
    SET name = ?, owner = ?, environment = ?, provider_type = ?, model_name = ?, sensitivity = ?, api_endpoint = ?, api_key_env_var = ?
    WHERE id = ?
  `).run(
    payload.name,
    payload.owner,
    payload.environment,
    payload.provider_type,
    payload.model_name,
    payload.sensitivity,
    payload.api_endpoint,
    payload.api_key_env_var || null,
    id,
  );

  return getServiceById(id);
}

export function deleteService(id) {
  const existing = getServiceById(id);
  if (!existing) {
    return null;
  }
  db.prepare(`DELETE FROM services WHERE id = ?`).run(id);
  return existing;
}

function mapServiceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    environment: row.environment,
    provider_type: row.provider_type || "anthropic",
    model_name: row.model_name,
    sensitivity: row.sensitivity,
    api_endpoint: row.api_endpoint,
    api_key_env_var: row.api_key_env_var || "",
    created_at: row.created_at,
  };
}