import type { WorkflowGraph } from "@flow-studio/shared";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
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
});
