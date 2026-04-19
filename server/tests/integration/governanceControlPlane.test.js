import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";

import { createApp, resetDatabase } from "../testUtils.js";

describe("governance control plane", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabase();
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = undefined;
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = undefined;
  });

  test("runtime status reports counts and runtime configuration", async () => {
    const response = await request(app).get("/api/governance/runtime-status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        runtime: expect.objectContaining({
          anthropic_configured: false,
          drift_threshold: 70,
        }),
        scheduler: expect.objectContaining({
          schedule: expect.any(String),
        }),
        counts: expect.objectContaining({
          services: 0,
          incidents: 0,
        }),
      }),
    );
  });

  test("admin can reseed and clear demo data", async () => {
    const reseedResponse = await request(app)
      .post("/api/governance/admin/reseed-demo-data")
      .set("x-demo-role", "Admin");

    expect(reseedResponse.status).toBe(201);
    expect(reseedResponse.body.counts.services).toBeGreaterThanOrEqual(3);
    expect(reseedResponse.body.counts.incidents).toBeGreaterThanOrEqual(2);

    const clearResponse = await request(app)
      .post("/api/governance/admin/clear-data")
      .set("x-demo-role", "Admin");

    expect(clearResponse.status).toBe(201);
    expect(clearResponse.body.counts).toEqual(
      expect.objectContaining({
        services: 0,
        incidents: 0,
        maintenance_plans: 0,
      }),
    );
  });

  test("admin can run a manual evaluation cycle from governance tools", async () => {
    await request(app)
      .post("/api/governance/admin/reseed-demo-data")
      .set("x-demo-role", "Admin");

    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: '{"status":"ok","summary":"healthy","actions":[]}' }],
      }),
    });

    const runResponse = await request(app)
      .post("/api/governance/admin/run-evaluation-cycle")
      .set("x-demo-role", "Admin");

    expect(runResponse.status).toBe(201);
    expect(runResponse.body.scheduler.last_run_status).toBe("success");
    expect(runResponse.body.counts.evaluations).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalled();
  });
});