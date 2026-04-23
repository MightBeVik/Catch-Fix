import { db } from "../../db.js";

export function createMetric({ service_id, latency_ms, error_rate, quality_score, timestamp }) {
  const result = db.prepare(`
    INSERT INTO metrics (service_id, latency_ms, error_rate, quality_score, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(service_id, latency_ms, error_rate, quality_score, timestamp);

  return getMetricById(result.lastInsertRowid);
}

export function createEvaluation({ service_id, score, category, result_details, timestamp }) {
  const result = db.prepare(`
    INSERT INTO evaluations (service_id, score, category, result_details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(service_id, score, category, JSON.stringify(result_details), timestamp);

  return getEvaluationById(result.lastInsertRowid);
}

export function getMetricById(id) {
  const row = db.prepare(`SELECT * FROM metrics WHERE id = ?`).get(id);
  return mapMetricRow(row);
}

export function getEvaluationById(id) {
  const row = db.prepare(`SELECT * FROM evaluations WHERE id = ?`).get(id);
  return mapEvaluationRow(row);
}

export function listLatestMetricsByService() {
  const rows = db.prepare(`
    SELECT m.*
    FROM metrics m
    INNER JOIN (
      SELECT service_id, MAX(timestamp) AS max_timestamp
      FROM metrics
      GROUP BY service_id
    ) latest ON latest.service_id = m.service_id AND latest.max_timestamp = m.timestamp
    ORDER BY m.service_id ASC
  `).all();

  return rows.map(mapMetricRow);
}

export function listRecentEvaluations(limit = 50) {
  const rows = db.prepare(`SELECT * FROM evaluations ORDER BY timestamp DESC, id DESC LIMIT ?`).all(limit);
  return rows.map(mapEvaluationRow);
}

export function listRecentMetricsForService(serviceId, limit = 10) {
  const rows = db.prepare(`
    SELECT *
    FROM metrics
    WHERE service_id = ?
    ORDER BY timestamp DESC, id DESC
    LIMIT ?
  `).all(serviceId, limit);

  return rows.map(mapMetricRow);
}

export function listRecentEvaluationsForService(serviceId, limit = 10) {
  const rows = db.prepare(`
    SELECT *
    FROM evaluations
    WHERE service_id = ?
    ORDER BY timestamp DESC, id DESC
    LIMIT ?
  `).all(serviceId, limit);

  return rows.map(mapEvaluationRow);
}

export function listEvaluationsForExport(startDate, endDate) {
  let query = `SELECT * FROM evaluations WHERE 1=1`;
  const params = [];

  if (startDate) {
    query += ` AND timestamp >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND timestamp <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY timestamp DESC, id DESC`;
  const rows = db.prepare(query).all(...params);
  return rows.map(mapEvaluationRow);
}

export function listLatestEvaluationSummaryByService() {
  const rows = db.prepare(`
    SELECT e.*
    FROM evaluations e
    INNER JOIN (
      SELECT service_id, category, MAX(timestamp) AS max_timestamp
      FROM evaluations
      GROUP BY service_id, category
    ) latest ON latest.service_id = e.service_id
      AND latest.category = e.category
      AND latest.max_timestamp = e.timestamp
    ORDER BY e.service_id ASC
  `).all();

  return rows.map(mapEvaluationRow);
}

function mapMetricRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    service_id: row.service_id,
    latency_ms: row.latency_ms,
    error_rate: row.error_rate,
    quality_score: row.quality_score,
    timestamp: row.timestamp,
  };
}

function mapEvaluationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    service_id: row.service_id,
    score: row.score,
    category: row.category,
    result_details: JSON.parse(row.result_details),
    timestamp: row.timestamp,
  };
}