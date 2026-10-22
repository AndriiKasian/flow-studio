import { afterEach, describe, expect, it, vi } from "vitest";

describe("App configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ["unset", undefined],
    ["misconfigured", "prod"],
  ])(
    "requires FRONTEND_URL when NODE_ENV is %s",
    async (_label, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("FRONTEND_URL", undefined);
      vi.resetModules();
      // Prevent a local .env from restoring FRONTEND_URL on module reload.
      vi.doMock("dotenv/config", () => ({}));

      await expect(import("../app.js")).rejects.toThrow(
        "FRONTEND_URL is required outside local development",
      );
    },
  );
});
