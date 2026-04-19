import { describe, beforeEach, expect, test } from "@jest/globals";
import request from "supertest";

import { createApp, resetDatabase } from "../testUtils.js";

describe("rbac and registry crud", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabase();
  });

  test("viewer cannot create a service", async () => {
    const response = await request(app)
      .post("/api/registry/services")
      .set("x-demo-role", "Viewer")
      .send({
        name: "Blocked Service",
        owner: "Viewer",
        environment: "dev",
        model_name: "claude-sonnet-4-20250514",
        sensitivity: "internal",
        api_endpoint: "https://api.anthropic.com/v1/messages",
      });

    expect(response.status).toBe(403);
  });

  test("admin can create, update, list, and delete a service", async () => {
    const createResponse = await request(app)
      .post("/api/registry/services")
      .set("x-demo-role", "Admin")
      .send({
        name: "Service A",
        owner: "Ops",
        environment: "dev",
        model_name: "claude-sonnet-4-20250514",
        sensitivity: "internal",
        api_endpoint: "https://api.anthropic.com/v1/messages",
      });

    expect(createResponse.status).toBe(201);
    const serviceId = createResponse.body.id;

    const updateResponse = await request(app)
      .put(`/api/registry/services/${serviceId}`)
      .set("x-demo-role", "Admin")
      .send({
        name: "Service A Updated",
        owner: "Ops",
        environment: "prod",
        model_name: "claude-sonnet-4-20250514",
        sensitivity: "confidential",
        api_endpoint: "https://api.anthropic.com/v1/messages",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.environment).toBe("prod");

    const listResponse = await request(app).get("/api/registry/services");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);

    const overviewResponse = await request(app).get(`/api/registry/services/${serviceId}/overview`);
    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.service.id).toBe(serviceId);
    expect(overviewResponse.body.summary).toEqual(
      expect.objectContaining({
        incident_count: 0,
        pending_maintenance_count: 0,
      }),
    );

    const deleteResponse = await request(app)
      .delete(`/api/registry/services/${serviceId}`)
      .set("x-demo-role", "Admin");
    expect(deleteResponse.status).toBe(204);
  });
});