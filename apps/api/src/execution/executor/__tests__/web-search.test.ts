import type { WorkflowGraph } from "@flow-studio/shared";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import type { NodeInput } from "../../collect-node-inputs";
import { executeWebSearch } from "../web-search";

type WorkflowNode = WorkflowGraph["nodes"][number];

const fetchMock = vi.fn<typeof fetch>();

function createNode(): WorkflowNode {
  return {
    id: "search-1",
    type: "webSearch",
    position: { x: 0, y: 0 },
    data: {},
  };
}

function createInput(value: unknown): NodeInput {
  return {
    sourceNodeId: "input-1",
    sourceHandle: "text",
    targetHandle: "query",
    value,
  };
}

function mockResponse(data: unknown, ok = true): void {
  fetchMock.mockResolvedValue({
    ok,
    json: (): Promise<unknown> => Promise.resolve(data),
  } as Response);
}

describe("executeWebSearch", () => {
  beforeEach(() => {
    vi.stubEnv("SERPER_API_KEY", "test-serper-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns normalized search results", async () => {
    mockResponse({
      organic: [
        {
          title: "React Documentation",
          link: "https://react.dev",
          snippet: "React official documentation",
        },
        {
          title: "Invalid result",
          link: "javascript:alert(1)",
          snippet: "Unsafe URL",
        },
        {
          title: "TypeScript",
          link: "https://www.typescriptlang.org",
        },
      ],
    });

    const result = await executeWebSearch(
      createNode(),
      [createInput("  React tutorials  ")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        results: JSON.stringify([
          {
            title: "React Documentation",
            url: "https://react.dev",
            snippet: "React official documentation",
          },
          {
            title: "TypeScript",
            url: "https://www.typescriptlang.org",
            snippet: "",
          },
        ]),
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://google.serper.dev/search",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-API-KEY": "test-serper-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "React tutorials",
          num: 5,
        }),
      }),
    );
  });

  it("rejects an empty query", async () => {
    const result = await executeWebSearch(
      createNode(),
      [createInput("   ")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "Web Search requires a non-empty query",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects queries exceeding 500 characters", async () => {
    const result = await executeWebSearch(
      createNode(),
      [createInput("a".repeat(501))],
    );

    expect(result).toEqual({
      status: "failed",
      error: "Web Search query exceeds the maximum allowed length",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing provider configuration", async () => {
    vi.stubEnv("SERPER_API_KEY", "");

    const result = await executeWebSearch(
      createNode(),
      [createInput("React")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "Web Search provider is not configured",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid provider response", async () => {
    mockResponse({
      unexpected: "data",
    });

    const result = await executeWebSearch(
      createNode(),
      [createInput("React")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "Web Search returned an invalid response",
    });
  });

  it("handles network errors without exposing details", async () => {
    fetchMock.mockRejectedValue(
      new Error("Sensitive provider error"),
    );

    const result = await executeWebSearch(
      createNode(),
      [createInput("React")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "Web Search request failed",
    });

    expect(JSON.stringify(result)).not.toContain(
      "Sensitive provider error",
    );
  });

  describe("provider diagnostics", () => {
    const QUERY = "Confidential search query";

    let consoleError: MockInstance<typeof console.error>;

    beforeEach(() => {
      // Production mode: logs must contain only allowlisted fields.
      vi.stubEnv("NODE_ENV", "production");

      consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
    });

    function loggedText(): string {
      return JSON.stringify(consoleError.mock.calls);
    }

    it("logs the HTTP status of a failed provider response", async () => {
      fetchMock.mockResolvedValue(
        new Response(`Invalid key test-serper-key for ${QUERY}`, {
          status: 403,
        }),
      );

      const result = await executeWebSearch(
        createNode(),
        [createInput(QUERY)],
      );

      expect(result).toEqual({
        status: "failed",
        error: "Web Search request failed",
      });
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "Web Search request failed",
        { status: 403 },
      );
      expect(loggedText()).not.toContain("test-serper-key");
      expect(loggedText()).not.toContain(QUERY);
    });

    it("logs a request timeout when the user has not cancelled", async () => {
      const controller = new AbortController();

      fetchMock.mockRejectedValue(
        new DOMException("The operation timed out", "TimeoutError"),
      );

      const result = await executeWebSearch(
        createNode(),
        [createInput(QUERY)],
        controller.signal,
      );

      expect(result).toEqual({
        status: "failed",
        error: "Web Search request failed",
      });
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "Web Search request failed",
        { name: "TimeoutError" },
      );
    });

    it("sanitizes provider errors in local development", async () => {
      vi.stubEnv("NODE_ENV", "development");

      fetchMock.mockRejectedValue(
        new TypeError(`fetch failed for ${QUERY} with test-serper-key`),
      );

      await executeWebSearch(createNode(), [createInput(QUERY)]);

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "Web Search request failed",
        { name: "TypeError" },
      );
    });

    it("logs network errors without their message", async () => {
      fetchMock.mockRejectedValue(
        new TypeError(`fetch failed for ${QUERY} with test-serper-key`),
      );

      await executeWebSearch(createNode(), [createInput(QUERY)]);

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "Web Search request failed",
        { name: "TypeError" },
      );
      expect(loggedText()).not.toContain("test-serper-key");
      expect(loggedText()).not.toContain(QUERY);
    });

    it("logs missing configuration by variable name only", async () => {
      vi.stubEnv("SERPER_API_KEY", "");

      await executeWebSearch(createNode(), [createInput(QUERY)]);

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "Web Search provider is not configured",
        { missingVariables: ["SERPER_API_KEY"] },
      );
    });

    it("does not log an expected cancellation", async () => {
      const controller = new AbortController();

      fetchMock.mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      });

      const result = await executeWebSearch(
        createNode(),
        [createInput(QUERY)],
        controller.signal,
      );

      expect(result).toEqual({
        status: "failed",
        error: "Web Search request was cancelled",
      });
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
