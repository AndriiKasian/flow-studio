import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { demoRateLimit } from "../demo-rate-limit.js";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.get("/workflow", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/run", demoRateLimit, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

function parseJsonResponse(responseText: string): unknown {
  const parsed: unknown = JSON.parse(responseText);
  return parsed;
}

describe("Demo rate limiting", () => {
  it("allows three requests and rejects the fourth", async () => {
    const app = createTestApp();

    const responses = [];

    for (let i = 0; i < 4; i += 1) {
      const response = await request(app)
        .post("/run")
        .send({});

      responses.push(response);
    }

    expect(responses.map((response) => response.status)).toEqual([
      200,
      200,
      200,
      429,
    ]);

    const lastResponse = responses[3];

    expect(lastResponse).toBeDefined();

    if (!lastResponse) {
      throw new Error("Expected a fourth response");
    }

    expect(parseJsonResponse(lastResponse.text)).toEqual({
      error: {
        code: "DEMO_RATE_LIMIT_EXCEEDED",
        message: "Too many demo runs.",
        retryAfterSeconds: 900,
      },
    });
  });

  it("does not apply the limiter to GET /workflow", async () => {
    const app = createTestApp();

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .get("/workflow")
        .expect(200);
    }
  });
});
