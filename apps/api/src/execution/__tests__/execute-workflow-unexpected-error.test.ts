import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { executeWorkflow } from "../execute-workflow";

const { executeNodeMock } = vi.hoisted(() => ({
  executeNodeMock: vi.fn(),
}));

vi.mock("../execute-node", () => ({
  executeNode: executeNodeMock,
}));

const SENSITIVE_DETAIL = "provider said: invalid key sk-test-secret";

const graph: WorkflowGraph = {
  nodes: [
    {
      id: "input-1",
      type: "textInput",
      position: { x: 0, y: 0 },
      data: { text: "hello" },
    },
    {
      id: "output-1",
      type: "textOutput",
      position: { x: 200, y: 0 },
      data: {},
    },
  ],
  edges: [
    {
      id: "edge-1",
      source: "input-1",
      sourceHandle: "text",
      target: "output-1",
      targetHandle: "input",
    },
  ],
};

describe("executeWorkflow unexpected node errors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    executeNodeMock.mockReset();
  });

  it("masks thrown error details and logs only diagnostics", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    executeNodeMock.mockRejectedValueOnce(
      Object.assign(new TypeError(SENSITIVE_DETAIL), {
        code: "ERR_PROVIDER",
      }),
    );

    const events: WorkflowExecutionEvent[] = [];
    const result = await executeWorkflow(graph, (event) => events.push(event));

    expect(result).toMatchObject({
      status: "failed",
      error: "Node execution failed unexpectedly",
      results: {
        "input-1": {
          status: "failed",
          error: "Node execution failed unexpectedly",
        },
        "output-1": { status: "skipped" },
      },
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "input-1",
      status: "failed",
      error: "Node execution failed unexpectedly",
    });

    expect(JSON.stringify({ result, events })).not.toContain("sk-test-secret");

    expect(errorSpy).toHaveBeenCalledWith(
      'Node "input-1" threw during execution',
      { name: "TypeError", code: "ERR_PROVIDER" },
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "sk-test-secret",
    );
  });
});
