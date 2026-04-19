import { beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";

import { createApp, resetDatabase } from "../testUtils.js";

describe("compliance export formatting", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabase();
  });

  test("export route returns the required top-level keys", async () => {
    const response = await request(app).get("/api/governance/compliance-export");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        exported_at: expect.any(String),
        date_range: expect.any(Object),
        evaluation_summaries: expect.any(Array),
        incidents: expect.any(Array),
        maintenance_actions_taken: expect.any(Array),
        audit_log_entries: expect.any(Array),
      })
    );
  });
});