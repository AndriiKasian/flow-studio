import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROXY_SECRET = "test-demo-proxy-secret";

// Reload the limiter so each test starts with an empty in-memory store.
async function createTestApp() {
  vi.resetModules();
  const { demoRateLimit } = await import("../demo-rate-limit.js");

  const app = express();

  app.post("/run", demoRateLimit, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

async function runTimes(
  app: express.Express,
  times: number,
  headers: Record<string, string>,
): Promise<number[]> {
  const statuses: number[] = [];

  for (let i = 0; i < times; i += 1) {
    const response = await request(app).post("/run").set(headers);
    statuses.push(response.status);
  }

  return statuses;
}

describe("Demo rate limit client IP resolution", () => {
  beforeEach(() => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", PROXY_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keys trusted proxy requests by the forwarded client IP", async () => {
    const app = await createTestApp();

    const firstVisitor = await runTimes(app, 4, {
      [TRUSTED_PROXY_SECRET_HEADER]: PROXY_SECRET,
      [TRUSTED_CLIENT_IP_HEADER]: "203.0.113.10",
    });

    const secondVisitor = await runTimes(app, 1, {
      [TRUSTED_PROXY_SECRET_HEADER]: PROXY_SECRET,
      [TRUSTED_CLIENT_IP_HEADER]: "203.0.113.11",
    });

    expect(firstVisitor).toEqual([200, 200, 200, 429]);
    expect(secondVisitor).toEqual([200]);
  });

  it("ignores the forwarded client IP without the proxy secret", async () => {
    const app = await createTestApp();

    const statuses: number[] = [];

    for (let i = 0; i < 4; i += 1) {
      const response = await request(app)
        .post("/run")
        .set(TRUSTED_CLIENT_IP_HEADER, `198.51.100.${i + 1}`);

      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("ignores the forwarded client IP with a wrong proxy secret", async () => {
    const app = await createTestApp();

    const statuses: number[] = [];

    for (let i = 0; i < 4; i += 1) {
      const response = await request(app)
        .post("/run")
        .set(TRUSTED_PROXY_SECRET_HEADER, "wrong-secret")
        .set(TRUSTED_CLIENT_IP_HEADER, `198.51.100.${i + 20}`)
        .set("X-Forwarded-For", "10.0.0.1");

      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe("Demo proxy requirement", () => {
  async function createProxyTestApp() {
    vi.resetModules();
    const { requireTrustedDemoProxy } = await import("../demo-proxy-guard.js");

    const app = express();

    app.post("/run", requireTrustedDemoProxy, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    return app;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["unset", undefined],
    ["misconfigured", "prod"],
    ["production", "production"],
  ])(
    "rejects direct requests when NODE_ENV is %s",
    async (_label, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("TRUSTED_PROXY_SECRET", PROXY_SECRET);

      const app = await createProxyTestApp();

      const direct = await request(app)
        .post("/run")
        .set("X-Forwarded-For", "203.0.113.50");

      const wrongSecret = await request(app)
        .post("/run")
        .set(TRUSTED_PROXY_SECRET_HEADER, "wrong-secret");

      expect(direct.status).toBe(403);
      expect(wrongSecret.status).toBe(403);
      expect(direct.body).toMatchObject({
        error: { code: "DEMO_PROXY_REQUIRED" },
      });
    },
  );

  it("accepts requests from the trusted proxy", async () => {
    vi.stubEnv("NODE_ENV", undefined);
    vi.stubEnv("TRUSTED_PROXY_SECRET", PROXY_SECRET);

    const app = await createProxyTestApp();

    const response = await request(app)
      .post("/run")
      .set(TRUSTED_PROXY_SECRET_HEADER, PROXY_SECRET);

    expect(response.status).toBe(200);
  });

  it("fails closed when the proxy secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", undefined);
    vi.stubEnv("TRUSTED_PROXY_SECRET", undefined);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const app = await createProxyTestApp();

      const response = await request(app)
        .post("/run")
        .set(TRUSTED_PROXY_SECRET_HEADER, "anything");

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: { code: "DEMO_TEMPORARILY_UNAVAILABLE" },
      });
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("allows direct requests in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRUSTED_PROXY_SECRET", undefined);

    const app = await createProxyTestApp();

    const response = await request(app).post("/run");

    expect(response.status).toBe(200);
  });
});
