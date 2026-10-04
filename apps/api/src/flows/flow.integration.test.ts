import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("Flows API", () => {
  it("creates a flow", async () => {
    const response = await request(app)
      .post("/flows")
      .send({
        name: "Integration Test Flow",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Integration Test Flow",
    });

    expect(response.body).toHaveProperty("id");
  });
});