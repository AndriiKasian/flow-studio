import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WRITE_LIMIT = 30;
const PROXY_SECRET = "test-trusted-proxy-secret";

// Reload the router so each test starts with an empty in-memory limiter store.
async function createTestApp() {
  vi.resetModules();
  const { flowRouter } = await import("../flow.routes.js");

  const app = express();
  app.use(express.json());
  app.use("/flows", flowRouter);

  return app;
}

// An empty name fails validation before any database access.
async function sendInvalidCreates(
  app: express.Express,
  times: number,
  headers: (index: number) => Record<string, string> = () => ({}),
): Promise<number[]> {
  const statuses: number[] = [];

  for (let i = 0; i < times; i += 1) {
    const response = await request(app)
      .post("/flows")
      .set(headers(i))
      .send({ name: "" });
    statuses.push(response.status);
  }

  return statuses;
}

describe("Flow write rate limiting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["unset", undefined],
    ["misconfigured", "prod"],
    ["production", "production"],
  ])(
    "limits writes when NODE_ENV is %s",
    async (_label, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);

      const app = await createTestApp();
      const statuses = await sendInvalidCreates(app, WRITE_LIMIT + 1);

      expect(statuses.slice(0, WRITE_LIMIT).every((s) => s === 400)).toBe(
        true,
      );
      expect(statuses[WRITE_LIMIT]).toBe(429);
    },
  );

  it("does not limit writes in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const app = await createTestApp();
    const statuses = await sendInvalidCreates(app, WRITE_LIMIT + 1);

    expect(statuses.every((s) => s === 400)).toBe(true);
  });

  describe("visitor identification behind the web proxy", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", undefined);
      vi.stubEnv("TRUSTED_PROXY_SECRET", PROXY_SECRET);
    });

    function fromVisitor(ip: string) {
      return () => ({
        [TRUSTED_PROXY_SECRET_HEADER]: PROXY_SECRET,
        [TRUSTED_CLIENT_IP_HEADER]: ip,
      });
    }

    it("limits each proxied visitor separately", async () => {
      const app = await createTestApp();

      const firstVisitor = await sendInvalidCreates(
        app,
        WRITE_LIMIT + 1,
        fromVisitor("203.0.113.10"),
      );
      const secondVisitor = await sendInvalidCreates(
        app,
        1,
        fromVisitor("203.0.113.11"),
      );

      expect(firstVisitor[WRITE_LIMIT]).toBe(429);
      expect(secondVisitor).toEqual([400]);
    });

    it("does not share proxied visitor buckets with untrusted requests", async () => {
      const app = await createTestApp();

      await sendInvalidCreates(app, WRITE_LIMIT + 1, () => ({
        [TRUSTED_CLIENT_IP_HEADER]: "203.0.113.20",
      }));

      const proxiedVisitor = await sendInvalidCreates(
        app,
        1,
        fromVisitor("203.0.113.20"),
      );

      expect(proxiedVisitor).toEqual([400]);
    });

    it.each([
      [
        "without the proxy secret",
        (i: number) => ({ [TRUSTED_CLIENT_IP_HEADER]: `198.51.100.${i + 1}` }),
      ],
      [
        "with a wrong proxy secret",
        (i: number) => ({
          [TRUSTED_PROXY_SECRET_HEADER]: "wrong-secret",
          [TRUSTED_CLIENT_IP_HEADER]: `198.51.100.${i + 1}`,
        }),
      ],
      [
        "with an invalid forwarded IP",
        (i: number) => ({
          [TRUSTED_PROXY_SECRET_HEADER]: PROXY_SECRET,
          [TRUSTED_CLIENT_IP_HEADER]: `visitor-${i}`,
        }),
      ],
    ])(
      "ignores rotating client IP headers %s",
      async (_label, headers) => {
        const app = await createTestApp();

        const statuses = await sendInvalidCreates(
          app,
          WRITE_LIMIT + 1,
          headers,
        );

        expect(statuses[WRITE_LIMIT]).toBe(429);
      },
    );

    it("ignores forwarded IPs when no proxy secret is configured", async () => {
      vi.stubEnv("TRUSTED_PROXY_SECRET", undefined);

      const app = await createTestApp();

      const statuses = await sendInvalidCreates(app, WRITE_LIMIT + 1, (i) => ({
        [TRUSTED_PROXY_SECRET_HEADER]: PROXY_SECRET,
        [TRUSTED_CLIENT_IP_HEADER]: `198.51.100.${i + 1}`,
      }));

      expect(statuses[WRITE_LIMIT]).toBe(429);
    });
  });
});
