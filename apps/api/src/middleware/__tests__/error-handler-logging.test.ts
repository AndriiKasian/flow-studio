import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../error-handler.js";

function createTestApp() {
  const app = express();

  app.get("/fail", () => {
    throw new Error("upstream failure with sensitive detail");
  });

  app.get("/fail-with-code", () => {
    throw Object.assign(
      new Error("connection to secret-host refused"),
      { code: "ECONNREFUSED" },
    );
  });

  app.use(errorHandler);

  return app;
}

describe("Error handler logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["unset", undefined],
    ["misconfigured", "prod"],
  ])(
    "logs redacted diagnostics when NODE_ENV is %s",
    async (_label, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await request(createTestApp()).get("/fail?token=abc");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
      expect(errorSpy).toHaveBeenCalledWith(
        "Unhandled API error: GET /fail",
        { name: "Error" },
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "sensitive detail",
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("token");
    },
  );

  it("keeps machine-readable error codes without the message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(createTestApp()).get("/fail-with-code");

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith(
      "Unhandled API error: GET /fail-with-code",
      { name: "Error", code: "ECONNREFUSED" },
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret-host");
  });
});
