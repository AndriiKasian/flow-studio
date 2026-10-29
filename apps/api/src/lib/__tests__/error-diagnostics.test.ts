import { inspect } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getErrorDiagnostics,
  logError,
  logFailure,
  logProviderError,
  sanitizeFailureDiagnostics,
} from "../error-diagnostics.js";

const SECRET = "sk-secret-key";
const PROMPT = "confidential prompt text";

function createProviderError(): Error {
  return Object.assign(
    new Error(`Incorrect API key ${SECRET} for prompt ${PROMPT}`),
    {
      name: "AuthenticationError",
      status: 401,
      code: "invalid_api_key",
      requestID: "req_abc123",
      headers: { authorization: `Bearer ${SECRET}` },
      error: { message: PROMPT },
    },
  );
}

describe("getErrorDiagnostics", () => {
  it("keeps only allowlisted provider error fields", () => {
    expect(getErrorDiagnostics(createProviderError())).toEqual({
      name: "AuthenticationError",
      code: "invalid_api_key",
      status: 401,
      requestId: "req_abc123",
    });
  });

  it("drops malformed codes, statuses and request IDs", () => {
    const error = Object.assign(new Error("failure"), {
      code: `bad code ${SECRET}`,
      status: "401",
      requestID: `req ${PROMPT}`,
    });

    expect(getErrorDiagnostics(error)).toEqual({ name: "Error" });
  });

  it("replaces an unsafe error name with the class name", () => {
    class ProviderError extends Error {}

    const error = new ProviderError("failure");
    error.name = `Leaked ${SECRET}`;

    expect(getErrorDiagnostics(error)).toEqual({ name: "ProviderError" });
  });

  it("falls back to Error without a usable constructor", () => {
    for (const constructor of [undefined, null]) {
      const error = Object.assign(new Error("failure"), {
        name: `Leaked ${SECRET}`,
        constructor,
      });

      expect(getErrorDiagnostics(error)).toEqual({ name: "Error" });
    }
  });

  it("preserves diagnostics for Node network errors", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      code: "ECONNREFUSED",
    });

    expect(getErrorDiagnostics(error)).toEqual({
      name: "TypeError",
      code: "ECONNREFUSED",
    });
  });

  it("describes non-Error values by type only", () => {
    expect(getErrorDiagnostics(SECRET)).toEqual({ name: "string" });
  });
});

describe("sanitizeFailureDiagnostics", () => {
  it("keeps valid enums and drops unsafe values", () => {
    expect(
      sanitizeFailureDiagnostics({
        status: 999,
        requestId: "req_1",
        responseStatus: "incomplete",
        incompleteReason: `max tokens ${PROMPT}`,
        missingVariables: ["OPENAI_MODEL", SECRET],
      }),
    ).toEqual({
      requestId: "req_1",
      responseStatus: "incomplete",
      missingVariables: ["OPENAI_MODEL"],
    });
  });
});

describe("production logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("never logs messages, headers or bodies outside local development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logError("LLM request failed", createProviderError());
    logFailure("LLM provider is not configured", {
      missingVariables: ["OPENAI_API_KEY"],
    });

    const logged = JSON.stringify(consoleError.mock.calls);

    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain(PROMPT);
    expect(consoleError.mock.calls).toEqual([
      [
        "LLM request failed",
        {
          name: "AuthenticationError",
          code: "invalid_api_key",
          status: 401,
          requestId: "req_abc123",
        },
      ],
      [
        "LLM provider is not configured",
        { missingVariables: ["OPENAI_API_KEY"] },
      ],
    ]);
  });
});

describe("development logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sanitizes provider errors while logError keeps the full error", () => {
    vi.stubEnv("NODE_ENV", "development");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const error = createProviderError();

    logProviderError("LLM request failed", error);
    logError("Unhandled API error", error);

    expect(consoleError).toHaveBeenNthCalledWith(
      1,
      "LLM request failed",
      {
        name: "AuthenticationError",
        code: "invalid_api_key",
        status: 401,
        requestId: "req_abc123",
      },
    );
    // logError keeps the raw error for local debugging of application errors.
    expect(consoleError.mock.calls[1]?.[0]).toBe("Unhandled API error");
    expect(consoleError.mock.calls[1]?.[1]).toBe(error);

    // Rendered as console.error would, including non-enumerable
    // message and stack properties of any Error instance.
    const providerOutput = inspect(consoleError.mock.calls[0], {
      depth: null,
      showHidden: true,
    });

    expect(providerOutput).not.toContain(SECRET);
    expect(providerOutput).not.toContain(PROMPT);
    expect(providerOutput).not.toContain("Incorrect API key");
    expect(providerOutput).not.toContain("error-diagnostics.test.ts");
  });
});
