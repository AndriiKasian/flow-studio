import { flowSchema } from "@flow-studio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app.js";

describe("Flows API", () => {
  it("creates a flow", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "Integration Test Flow",
        description: "Created by integration test",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Integration Test Flow",
      description: "Created by integration test",
    });
    expect(response.body).toHaveProperty("id");
  });

  it("returns 400 when flow name is empty", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "",
        description: "Invalid flow",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Invalid request");
  });

  it("normalizes missing description to null", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "Flow Without Description",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Flow Without Description",
      description: null,
    });
  });

  it("returns created flows", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow For List Test",
        description: "Should appear in flows list",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const response = await request(app).get("/flows");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdFlow.id,
          name: "Flow For List Test",
          description: "Should appear in flows list",
        }),
      ]),
    );
  });

  it("updates a flow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow Before Update",
        description: "Before update",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const response = await request(app)
      .patch(`/flows/${createdFlow.id}`)
      .send({
        name: "Flow After Update",
        description: "After update",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: createdFlow.id,
      name: "Flow After Update",
      description: "After update",
    });
  });

  it("deletes a flow", async () => {
    const createResponse = await request(app)
      .post("/flows")
      .send({
        name: "Flow To Delete",
        description: "Should be deleted",
      });

    expect(createResponse.status).toBe(201);

    const createdFlow = flowSchema.parse(createResponse.body);

    const deleteResponse = await request(app).delete(
      `/flows/${createdFlow.id}`,
    );

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(
      `/flows/${createdFlow.id}`,
    );

    expect(getResponse.status).toBe(404);
  });

  it("returns flows ordered by most recently updated", async () => {
    const firstCreateResponse = await request(app)
      .post("/flows")
      .send({
        name: "Older Flow",
        description: "Created first",
      });

    expect(firstCreateResponse.status).toBe(201);

    const firstFlow = flowSchema.parse(firstCreateResponse.body);

    const secondCreateResponse = await request(app)
      .post("/flows")
      .send({
        name: "Newer Flow",
        description: "Created second",
      });

    expect(secondCreateResponse.status).toBe(201);

    const secondFlow = flowSchema.parse(secondCreateResponse.body);

    const updateResponse = await request(app)
      .patch(`/flows/${firstFlow.id}`)
      .send({
        name: "Older Flow Updated",
      });

    expect(updateResponse.status).toBe(200);

    const response = await request(app).get("/flows");

    expect(response.status).toBe(200);

    const flows = flowSchema.array().parse(response.body);

    const updatedFlowIndex = flows.findIndex(
      (flow) => flow.id === firstFlow.id,
    );
    const secondFlowIndex = flows.findIndex(
      (flow) => flow.id === secondFlow.id,
    );

    expect(updatedFlowIndex).toBeGreaterThanOrEqual(0);
    expect(secondFlowIndex).toBeGreaterThanOrEqual(0);
    expect(updatedFlowIndex).toBeLessThan(secondFlowIndex);
  });
});