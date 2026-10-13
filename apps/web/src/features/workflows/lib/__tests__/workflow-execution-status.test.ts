import { describe, expect, it } from "vitest";

import {
  applyWorkflowExecutionEvent,
  failRunningNodes,
  initialWorkflowExecutionState,
} from "../workflow-execution-status";

describe("failRunningNodes", () => {
  it("marks nodes left running by an interrupted stream as failed", () => {
    let state = applyWorkflowExecutionEvent(initialWorkflowExecutionState, {
      type: "node:start",
      nodeId: "input-1",
    });
    state = applyWorkflowExecutionEvent(state, {
      type: "node:stop",
      nodeId: "input-1",
      status: "completed",
      outputs: { text: "hello" },
    });
    state = applyWorkflowExecutionEvent(state, {
      type: "node:start",
      nodeId: "transform-1",
    });

    const result = failRunningNodes(state);

    expect(result.nodeStatuses).toEqual({
      "input-1": "completed",
      "transform-1": "failed",
    });
    expect(result.nodeOutputs).toEqual({
      "input-1": { text: "hello" },
    });
  });

  it("returns the same state when no node is running", () => {
    const state = applyWorkflowExecutionEvent(
      initialWorkflowExecutionState,
      { type: "node:stop", nodeId: "output-1", status: "skipped" },
    );

    expect(failRunningNodes(state)).toBe(state);
  });
});
