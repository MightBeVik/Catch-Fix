import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";

import { createApp, resetDatabase } from "../testUtils.js";

describe("incident summary human review flow", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabase();
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Stakeholder Update: Service is degraded.\nLikely Root Causes: Prompt regression and upstream latency." }],
      }),
    });
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = undefined;
  });

  test("incident draft generation does not save until explicit approval", async () => {
    const createResponse = await request(app)
      .post("/api/incidents/")
      .set("x-demo-role", "Maintainer")
      .send({
        service_name: "Incident Service",
        severity: "high",
        symptoms: "Latency is spiking and responses are malformed.",
        timeline: "13:00 alert fired, 13:10 manual triage started.",
        checklist_json: {
          data_issue: false,
          prompt_change: true,
          model_update: false,
          infrastructure_problem: true,
          safety_policy_failure: false,
        },
        approved: false,
      });

    const incidentId = createResponse.body.id;

    const generateResponse = await request(app)
      .post(`/api/incidents/${incidentId}/generate-summary`)
      .set("x-demo-role", "Maintainer");

    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.review_required).toBe(true);

    const approveResponse = await request(app)
      .post(`/api/incidents/${incidentId}/approve-summary`)
      .set("x-demo-role", "Maintainer")
      .send({ llm_summary: generateResponse.body.draft_summary });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.approved).toBe(true);
    expect(approveResponse.body.llm_summary).toContain("Stakeholder Update");
  });
});