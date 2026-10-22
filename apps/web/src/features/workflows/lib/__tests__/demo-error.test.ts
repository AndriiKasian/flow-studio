import { describe, expect, it } from "vitest";

import { getDemoErrorMessage } from "../demo-error";

describe("getDemoErrorMessage", () => {
  it("uses the message from structured demo errors", () => {
    expect(
      getDemoErrorMessage(
        {
          error: {
            code: "DEMO_DAILY_LIMIT_REACHED",
            message: "Daily demo limit reached.",
            retryAfterSeconds: 3600,
          },
        },
        429,
      ),
    ).toBe("Daily demo limit reached.");

    expect(
      getDemoErrorMessage(
        {
          error: {
            code: "DEMO_CONCURRENT_RUN_LIMIT",
            message: "Demo is currently busy. Please try again shortly.",
            retryAfterSeconds: null,
          },
        },
        503,
      ),
    ).toBe("Demo is currently busy. Please try again shortly.");
  });

  it("supports plain string errors from the proxy", () => {
    expect(
      getDemoErrorMessage({ error: "API_URL is not configured" }, 500),
    ).toBe("API_URL is not configured");
  });

  it("falls back to the HTTP status for unknown bodies", () => {
    expect(getDemoErrorMessage(null, 502)).toBe(
      "Failed to start demo: HTTP 502",
    );
    expect(getDemoErrorMessage({ error: { code: "X" } }, 429)).toBe(
      "Failed to start demo: HTTP 429",
    );
  });
});
