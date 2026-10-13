import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../../app.js";

describe("Error handler - request body", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const response = await request(app)
      .post(`/flows/${randomUUID()}/execute/stream`)
      .set("Content-Type", "application/json")
      .send('{"nodes": [');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Malformed JSON request body",
    });
  });

  it("returns 413 for an oversized JSON body", async () => {
    const response = await request(app)
      .post("/flows")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ name: "x".repeat(200 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: "Request body is too large",
    });
  });
});
