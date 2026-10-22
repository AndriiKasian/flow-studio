import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { executeWorkflow } from "../execute-workflow";

const fetchMock = vi.fn<typeof fetch>();

function createGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "input-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: "React documentation" },
      },
      {
        id: "search-1",
        type: "webSearch",
        position: { x: 200, y: 0 },
        data: {},
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 400, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        sourceHandle: "text",
        target: "search-1",
        targetHandle: "query",
      },
      {
        id: "edge-2",
        source: "search-1",
        sourceHandle: "results",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  };
}

function mockResponse(data: unknown, ok = true): void {
  fetchMock.mockResolvedValue({
    ok,
    json: (): Promise<unknown> => Promise.resolve(data),
  } as Response);
}

describe("Web Search workflow", () => {
  beforeEach(() => {
    vi.stubEnv("SERPER_API_KEY", "test-serper-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("executes Text Input → Web Search → Text Output", async () => {
    mockResponse({
      organic: [
        {
          title: "React",
          link: "https://react.dev",
          snippet: "Official React documentation",
        },
      ],
    });

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    const searchResults = JSON.stringify([
      {
        title: "React",
        url: "https://react.dev",
        snippet: "Official React documentation",
      },
    ]);

    expect(result.status).toBe("completed");

    expect(result.results["input-1"]).toEqual({
      status: "completed",
      outputs: {
        text: "React documentation",
      },
    });

    expect(result.results["search-1"]).toEqual({
      status: "completed",
      outputs: {
        results: searchResults,
      },
    });

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: {
        result: searchResults,
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://google.serper.dev/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          q: "React documentation",
          num: 5,
        }),
      }),
    );

    expect(events.map((event) => event.type)).toEqual([
      "flow:start",
      "node:start",
      "node:stop",
      "node:start",
      "node:stop",
      "node:start",
      "node:stop",
      "flow:stop",
    ]);

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "completed",
    });
  });

  it("stops the workflow when Web Search fails", async () => {
    fetchMock.mockRejectedValue(
      new Error("Sensitive Serper error"),
    );

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("failed");

    expect(result.results["search-1"]).toEqual({
      status: "failed",
      error: "Web Search request failed",
    });

    expect(result.results["output-1"]).toEqual({
      status: "skipped",
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "search-1",
      status: "failed",
      error: "Web Search request failed",
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "output-1",
      status: "skipped",
    });

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "failed",
      error: 'Node "search-1" failed: Web Search request failed',
    });

    expect(JSON.stringify(result)).not.toContain(
      "Sensitive Serper error",
    );
  });
});
