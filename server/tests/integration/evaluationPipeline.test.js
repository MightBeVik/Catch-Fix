import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";

import { createApp, resetDatabase } from "../testUtils.js";

describe("evaluation pipeline integration", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabase();
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: '{"status":"ok","summary":"healthy","actions":[]}' }],
      }),
    });
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = undefined;
  });

  test("service create followed by evaluation run stores monitoring data", async () => {
    const createServiceResponse = await request(app)
      .post("/api/registry/services")
      .set("x-demo-role", "Admin")
      .send({
        name: "Eval Service",
        owner: "Ops",
        environment: "dev",
        model_name: "claude-sonnet-4-20250514",
        sensitivity: "internal",
        api_endpoint: "https://api.anthropic.com/v1/messages",
      });

    const runResponse = await request(app)
      .post("/api/monitoring/evaluations/run")
      .set("x-demo-role", "Maintainer")
      .send({ service_id: createServiceResponse.body.id });

    expect(runResponse.status).toBe(201);
    expect(runResponse.body.quality_score).toBe(100);

    const dashboardResponse = await request(app).get("/api/monitoring/dashboard");
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.services[0].latest_metric.quality_score).toBe(100);

    const evaluationsResponse = await request(app).get("/api/monitoring/evaluations");
    expect(evaluationsResponse.body.items).toHaveLength(2);
  });
});