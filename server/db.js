import bcrypt from "bcryptjs";
import { DatabaseSync as Database } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH || "./data/catch_fix.db";
const resolvedPath = path.resolve(process.cwd(), databasePath);
console.log("!!! DATABASE RESOLVED AT:", resolvedPath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

export const db = new Database(resolvedPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      environment TEXT NOT NULL CHECK(environment IN ('dev', 'prod')),
      provider_type TEXT NOT NULL DEFAULT 'anthropic',
      model_name TEXT NOT NULL,
      sensitivity TEXT NOT NULL CHECK(sensitivity IN ('public', 'internal', 'confidential')),
      api_endpoint TEXT NOT NULL,
      api_key_env_var TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      latency_ms REAL NOT NULL,
      error_rate REAL NOT NULL,
      quality_score REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      score REAL NOT NULL,
      category TEXT NOT NULL,
      result_details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      symptoms TEXT NOT NULL,
      timeline TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      llm_summary TEXT,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      next_eval_time TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
      rollback_plan TEXT NOT NULL,
      validation_steps TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL DEFAULT '',
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Maintainer', 'Viewer')) DEFAULT 'Viewer',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Maintainer', 'Viewer')) DEFAULT 'Viewer',
      token TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS governance_policy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn("services", "provider_type", "TEXT NOT NULL DEFAULT 'anthropic'");
  ensureColumn("services", "api_key_env_var", "TEXT");
  ensureColumn("audit_log", "username", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("incidents", "resolved", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("incidents", "resolved_at", "TEXT");
  ensureColumn("maintenance_plans", "status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn("maintenance_plans", "completed_at", "TEXT");
  ensureColumn("maintenance_plans", "eval_mode", "TEXT NOT NULL DEFAULT 'full'");
}

export function ensureDefaultAdmin() {
  const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const hash = bcrypt.hashSync(password, 10);
  
  // Admin
  db.prepare(
    "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'Admin')",
  ).run("admin", "admin@catchfix.local", hash);

  // Maintainer
  db.prepare(
    "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'Maintainer')",
  ).run("maintainer", "maintainer@catchfix.local", hash);

  // Viewer
  db.prepare(
    "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'Viewer')",
  ).run("viewer", "viewer@catchfix.local", hash);

  console.log(`\n[Catch-Fix] Demo users created (admin, maintainer, viewer) — password: ${password}\n`);
}

export function clearOperationalData() {
  initializeDatabase();
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM maintenance_plans;
    DELETE FROM evaluations;
    DELETE FROM metrics;
    DELETE FROM incidents;
    DELETE FROM services;
    DELETE FROM sqlite_sequence;
  `);
}

export function seedDemoData({ force = false } = {}) {
  const shouldSeed = String(process.env.DEMO_SEED_DATA ?? "true").toLowerCase();
  if (!force && ["0", "false", "no"].includes(shouldSeed)) {
    return;
  }

  const serviceSpecs = [
    {
      name: "Claude Ops Assistant",
      owner: "AIM Team",
      environment: "dev",
      provider_type: "anthropic",
      model_name: "claude-sonnet-4-20250514",
      sensitivity: "internal",
      api_endpoint: "https://api.anthropic.com/v1/messages",
      api_key_env_var: "ANTHROPIC_API_KEY",
    },
    {
      name: "Sam Altman's Worst Nightmare",
      owner: "AIM Team",
      environment: "dev",
      provider_type: "openai",
      model_name: "gpt-4.1-mini",
      sensitivity: "internal",
      api_endpoint: "https://api.openai.com/v1/chat/completions",
      api_key_env_var: "OPENAI_API_KEY",
    },
  ];

  const services = serviceSpecs.map(ensureService);
  ensureMonitoringHistory(services);
  ensureIncidents(services);
  ensureMaintenancePlans(services);
  seedPolicy();
}

export function seedPolicy() {
  const policies = [
    {
      key: "data_stored",
      value: JSON.stringify([
        "Service registry metadata and endpoints",
        "Evaluation results and derived metrics",
        "Incident records and approved summaries",
        "Maintenance plans and audit log entries",
      ]),
    },
    {
      key: "prompts_logged",
      value: "Prompts are not retained beyond evaluation and incident workflow result details needed for governance records.",
    },
    {
      key: "llm_routing",
      value: "LLM requests are routed from the backend through Anthropic, OpenAI-compatible, and Ollama adapters. API keys, when required, never leave the server.",
    },
    {
      key: "retention",
      value: "SQLite data is stored locally in the server data directory for this course project and retained until manually removed.",
    },
  ];

  for (const policy of policies) {
    db.prepare(`
      INSERT OR IGNORE INTO governance_policy (key, value)
      VALUES (?, ?)
    `).run(policy.key, policy.value);
  }
}

export function getPolicy() {
  const rows = db.prepare("SELECT key, value FROM governance_policy").all();
  const policy = {};
  for (const row of rows) {
    try {
      policy[row.key] = JSON.parse(row.value);
    } catch {
      policy[row.key] = row.value;
    }
  }
  return policy;
}

export function updatePolicyValue(key, value) {
  const valueStr = typeof value === "string" ? value : JSON.stringify(value);
  db.prepare(`
    UPDATE governance_policy 
    SET value = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE key = ?
  `).run(valueStr, key);
}

export function resetAndSeedDemoData({ force = false } = {}) {
  clearOperationalData();
  seedDemoData({ force });
}

export function getOperationalCounts() {
  return {
    services: getCount("services"),
    metrics: getCount("metrics"),
    evaluations: getCount("evaluations"),
    incidents: getCount("incidents"),
    maintenance_plans: getCount("maintenance_plans"),
    audit_log: getCount("audit_log"),
  };
}

export function healthCheckDatabase() {
  return db.prepare("select 1 as ok").get();
}

function getCount(tableName) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureService(service) {
  const existing = db.prepare(`SELECT * FROM services WHERE name = ?`).get(service.name);
  if (existing) {
    return existing;
  }

  const createdAt = hoursAgoIso(72);
  const result = db.prepare(`
    INSERT INTO services (name, owner, environment, provider_type, model_name, sensitivity, api_endpoint, api_key_env_var, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    service.name,
    service.owner,
    service.environment,
    service.provider_type || "anthropic",
    service.model_name,
    service.sensitivity,
    service.api_endpoint,
    service.api_key_env_var || null,
    createdAt,
  );

  const created = db.prepare(`SELECT * FROM services WHERE id = ?`).get(result.lastInsertRowid);
  insertAuditLog({
    userRole: "Admin",
    action: "service_created",
    entityType: "service",
    entityId: created.id,
    newValue: created,
    timestamp: createdAt,
  });
  return created;
}

function ensureMonitoringHistory(services) {
  for (const service of services) {
    const existingMetricCount = db.prepare(`SELECT COUNT(*) AS count FROM metrics WHERE service_id = ?`).get(service.id).count;
    const existingEvaluationCount = db.prepare(`SELECT COUNT(*) AS count FROM evaluations WHERE service_id = ?`).get(service.id).count;

    if (existingMetricCount > 0 || existingEvaluationCount > 0) {
      continue;
    }

    const snapshots = monitoringSeedByName(service.name);
    for (const snapshot of snapshots) {
      db.prepare(`
        INSERT INTO evaluations (service_id, score, category, result_details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        service.id,
        snapshot.formattingScore,
        "formatting_correctness",
        JSON.stringify({
          valid_json: snapshot.formattingScore === 100,
          message: snapshot.formattingScore === 100 ? "Output parsed as valid JSON." : "Output was not valid JSON.",
          output_preview: snapshot.preview,
          triggered_by: snapshot.triggeredBy,
        }),
        snapshot.timestamp,
      );

      db.prepare(`
        INSERT INTO evaluations (service_id, score, category, result_details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        service.id,
        snapshot.policyScore,
        "policy_adherence",
        JSON.stringify({
          pii_hits: snapshot.policyScore === 100 ? [] : ["email"],
          message: snapshot.policyScore === 100 ? "No email or phone patterns detected." : "Detected disallowed patterns: email",
          output_preview: snapshot.preview,
          triggered_by: snapshot.triggeredBy,
        }),
        snapshot.timestamp,
      );

      db.prepare(`
        INSERT INTO evaluations (service_id, score, category, result_details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        service.id,
        snapshot.judgeScore || 100,
        "judge_quality",
        JSON.stringify({
          reasoning: snapshot.judgeReasoning || "Judged via initial seed data.",
          matched_facts: snapshot.judgeMatchedFacts || ["status", "summary", "actions"],
          missing_facts: snapshot.judgeMissingFacts || [],
        }),
        snapshot.timestamp,
      );

      db.prepare(`
        INSERT INTO metrics (service_id, latency_ms, error_rate, quality_score, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(service.id, snapshot.latencyMs, snapshot.errorRate, snapshot.qualityScore, snapshot.timestamp);
    }
  }
}

function ensureIncidents(services) {
  const serviceByName = new Map(services.map((service) => [service.name, service]));
  const incidents = [
    {
      serviceName: "Claude Ops Assistant",
      severity: "high",
      symptoms: "Latent drift detected in formatting accuracy.",
      timeline: "Detected at T-2h by scheduler. Manual verification confirmed 15% regression.",
      checklist: [
        { task: "Identify root cause of drift", completed: true },
        { task: "Update prompt template", completed: false },
        { task: "Verify fix in dev environment", completed: false }
      ],
      llmSummary: "The Claude Ops Assistant is experiencing a gradual decline in JSON output quality, likely due to recent prompt adjustments in the underlying model version.",
      approved: false,
      createdAt: hoursAgoIso(2),
      updatedAt: hoursAgoIso(1),
    },
    {
      serviceName: "Sam Altman's Worst Nightmare",
      severity: "critical",
      symptoms: "Intermittent 503 errors during peak load.",
      timeline: "Initial alerts triggered at T-5h. Automatic failover initiated.",
      checklist: [
        { task: "Check rate limit status", completed: true },
        { task: "Review retry logic in adapter", completed: true },
        { task: "Scale backend instances", completed: true }
      ],
      llmSummary: "A sudden spike in traffic caused the OpenAI adapter to hit rate limits, resulting in cascading failures across the Nightmare service cluster.",
      approved: true,
      createdAt: hoursAgoIso(6),
      updatedAt: hoursAgoIso(4),
    }
  ];

  for (const incident of incidents) {
    const service = serviceByName.get(incident.serviceName);
    if (!service) {
      continue;
    }

    const existing = db.prepare(`SELECT id FROM incidents WHERE service_name = ? AND symptoms = ?`).get(incident.serviceName, incident.symptoms);
    if (existing) {
      continue;
    }

    const result = db.prepare(`
      INSERT INTO incidents (service_name, severity, symptoms, timeline, checklist_json, llm_summary, approved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incident.serviceName,
      incident.severity,
      incident.symptoms,
      incident.timeline,
      JSON.stringify(incident.checklist),
      incident.llmSummary,
      incident.approved ? 1 : 0,
      incident.createdAt,
      incident.updatedAt,
    );

    insertAuditLog({
      userRole: "Maintainer",
      action: incident.approved ? "incident_summary_approved" : "incident_created",
      entityType: "incident",
      entityId: result.lastInsertRowid,
      newValue: {
        service_name: incident.serviceName,
        severity: incident.severity,
        symptoms: incident.symptoms,
        approved: incident.approved,
      },
      timestamp: incident.updatedAt,
    });
  }
}

function ensureMaintenancePlans(services) {
  const planSpecs = [
    {
      serviceName: "Claude Ops Assistant",
      nextEvalTime: hoursFromNowIso(6),
      riskLevel: "medium",
      rollbackPlan: "Revert to the previous prompt template, disable the latest routing rule, and restore the prior model alias if response quality regresses.",
      validationSteps: "Run the registry connection test, execute one manual evaluation, and review governance export entries for the updated prompt path.",
      approved: true,
      createdAt: hoursAgoIso(4),
    },
    {
      serviceName: "Sam Altman's Worst Nightmare",
      nextEvalTime: hoursFromNowIso(24),
      riskLevel: "low",
      rollbackPlan: "Flush the regional cache and restart the adapter instances to clear stale session tokens.",
      validationSteps: "Monitor 5xx error rates for 10 minutes post-deployment and verify token refresh cycles via logs.",
      approved: false,
      createdAt: hoursAgoIso(12),
    },
  ];

  for (const plan of planSpecs) {
    const service = services.find((item) => item.name === plan.serviceName);
    if (!service) {
      continue;
    }

    const existing = db.prepare(`SELECT id FROM maintenance_plans WHERE service_id = ? AND rollback_plan = ?`).get(service.id, plan.rollbackPlan);
    if (existing) {
      continue;
    }

    const result = db.prepare(`
      INSERT INTO maintenance_plans (service_id, next_eval_time, risk_level, rollback_plan, validation_steps, approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      service.id,
      plan.nextEvalTime,
      plan.riskLevel,
      plan.rollbackPlan,
      plan.validationSteps,
      plan.approved ? 1 : 0,
      plan.createdAt,
    );

    insertAuditLog({
      userRole: "Admin",
      action: "maintenance_plan_created",
      entityType: "maintenance_plan",
      entityId: result.lastInsertRowid,
      newValue: {
        service_id: service.id,
        risk_level: plan.riskLevel,
        approved: plan.approved,
      },
      timestamp: plan.createdAt,
    });
  }
}

function monitoringSeedByName(serviceName) {
  const defaults = [
    {
      timestamp: hoursAgoIso(72),
      formattingScore: 100,
      policyScore: 100,
      judgeScore: 100,
      judgeReasoning: "Baseline performance snapshot.",
      judgeMatchedFacts: ["status", "summary", "actions"],
      judgeMissingFacts: [],
      qualityScore: 100,
      latencyMs: 750,
      errorRate: 0,
      triggeredBy: "scheduler",
      preview: '{"status":"ok","summary":"Stable baseline.","actions":[]}',
    },
    {
      timestamp: hoursAgoIso(48),
      formattingScore: 100,
      policyScore: 100,
      judgeScore: 90,
      judgeReasoning: "Slight factual omission in summary.",
      judgeMatchedFacts: ["status", "actions"],
      judgeMissingFacts: ["summary"],
      qualityScore: 95,
      latencyMs: 820,
      errorRate: 0,
      triggeredBy: "scheduler",
      preview: '{"status":"ok","actions":["check"]}',
    },
    {
      timestamp: hoursAgoIso(28),
      formattingScore: 100,
      policyScore: 100,
      judgeScore: 100,
      judgeReasoning: "Response contains expected facts.",
      judgeMatchedFacts: ["status", "summary", "actions"],
      judgeMissingFacts: [],
      qualityScore: 100,
      latencyMs: 812,
      errorRate: 0,
      triggeredBy: "scheduler",
      preview: '{"status":"ok","summary":"Nominal response quality.","actions":["monitor"]}',
    },
    {
      timestamp: hoursAgoIso(12),
      formattingScore: 100,
      policyScore: 80,
      judgeScore: 100,
      judgeReasoning: "High quality but PII detected.",
      judgeMatchedFacts: ["status", "summary", "actions"],
      judgeMissingFacts: [],
      qualityScore: 90,
      latencyMs: 950,
      errorRate: 0.05,
      triggeredBy: "scheduler",
      preview: '{"status":"ok","summary":"User melissa@example.com logged in."}',
    },
    {
      timestamp: hoursAgoIso(2),
      formattingScore: 100,
      policyScore: 100,
      judgeScore: 100,
      judgeReasoning: "Healthy response.",
      judgeMatchedFacts: ["status", "summary", "actions"],
      judgeMissingFacts: [],
      qualityScore: 100,
      latencyMs: 640,
      errorRate: 0,
      triggeredBy: "manual",
      preview: '{"status":"ok","summary":"Healthy service output.","actions":["none"]}',
    },
  ];

  return defaults;
}

function insertAuditLog({ userRole, action, entityType, entityId, oldValue = null, newValue = null, timestamp }) {
  db.prepare(`
    INSERT INTO audit_log (user_role, action, entity_type, entity_id, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userRole,
    action,
    entityType,
    String(entityId),
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    timestamp,
  );
}

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNowIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
