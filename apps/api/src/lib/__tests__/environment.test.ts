import { afterEach, describe, expect, it, vi } from "vitest";

import { isLocalEnvironment } from "../environment.js";

describe("isLocalEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["development", "test"])(
    "treats NODE_ENV=%s as local",
    (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);

      expect(isLocalEnvironment()).toBe(true);
    },
  );

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["production", "production"],
    ["misspelled", "prod"],
    ["differently cased", "Development"],
  ])("fails closed when NODE_ENV is %s", (_label, nodeEnv) => {
    vi.stubEnv("NODE_ENV", nodeEnv);

    expect(isLocalEnvironment()).toBe(false);
  });
});
