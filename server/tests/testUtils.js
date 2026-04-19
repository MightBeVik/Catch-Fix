process.env.DATABASE_PATH = "./data/test.db";
process.env.DEMO_SEED_DATA = "false";

export const { db, initializeDatabase } = await import("../db.js");
export const { createApp } = await import("../src/app.js");

export function resetDatabase() {
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