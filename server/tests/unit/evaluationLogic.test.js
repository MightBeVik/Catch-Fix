import { describe, expect, test } from "@jest/globals";

import { buildMonitoringOverview, evaluateFormatting, evaluatePolicy } from "../../src/services/evaluationService.js";

describe("evaluation scoring logic", () => {
  test("formatting correctness passes for valid JSON", () => {
    const result = evaluateFormatting('{"status":"ok"}');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  test("formatting correctness fails for invalid JSON", () => {
    const result = evaluateFormatting("not-json");
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  test("policy adherence fails when email or phone patterns are present", () => {
    const result = evaluatePolicy("Contact me at user@example.com or 555-123-4567");
    expect(result.passed).toBe(false);
    expect(result.result_details.pii_hits).toEqual(expect.arrayContaining(["email", "phone"]));
  });

  test("drift detection flags low quality services in dashboard overview", () => {
    const overview = buildMonitoringOverview(
      [{ id: 1, name: "Test Service", owner: "Ops", environment: "dev", model_name: "claude", sensitivity: "internal", api_endpoint: "https://api.anthropic.com/v1/messages", created_at: new Date().toISOString() }],
      [{ id: 1, service_id: 1, latency_ms: 120, error_rate: 50, quality_score: 40, timestamp: new Date().toISOString() }],
      []
    );
    expect(overview.services[0].drift_flagged).toBe(true);
  });
});