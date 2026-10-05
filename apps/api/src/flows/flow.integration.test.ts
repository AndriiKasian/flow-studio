import request from "supertest";
import { describe, expect, it } from "vitest";
import { flowSchema } from "@flow-studio/shared";

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
});