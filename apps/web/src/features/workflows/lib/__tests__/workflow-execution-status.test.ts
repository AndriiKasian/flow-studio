import { describe, expect, it } from "vitest";

import { getWorkflowEdgeStatus } from "../workflow-edge-status";
import {
  applyWorkflowExecutionEvent,
  initialWorkflowExecutionState,
  skipRunningNodes,
} from "../workflow-execution-status";

describe("skipRunningNodes", () => {
  it("marks nodes left running by an interrupted stream as skipped, not failed", () => {
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

    const result = skipRunningNodes(state);

    expect(result.nodeStatuses).toEqual({
      "input-1": "completed",
      "transform-1": "skipped",
    });
    // The edge into the interrupted node is not drawn as a failure either.
    expect(
      getWorkflowEdgeStatus(
        result.nodeStatuses["input-1"],
        result.nodeStatuses["transform-1"],
      ),
    ).toBe("skipped");
    expect(result.nodeOutputs).toEqual({
      "input-1": { text: "hello" },
    });
  });

  it("returns the same state when no node is running", () => {
    const state = applyWorkflowExecutionEvent(
      initialWorkflowExecutionState,
      { type: "node:stop", nodeId: "output-1", status: "skipped" },
    );

    expect(skipRunningNodes(state)).toBe(state);
  });

  it("keeps confirmed node failures failed", () => {
    let state = applyWorkflowExecutionEvent(initialWorkflowExecutionState, {
      type: "node:start",
      nodeId: "search-1",
    });
    state = applyWorkflowExecutionEvent(state, {
      type: "node:stop",
      nodeId: "search-1",
      status: "failed",
      error: "Web Search failed",
    });
    state = applyWorkflowExecutionEvent(state, {
      type: "node:start",
      nodeId: "prompt-1",
    });

    expect(skipRunningNodes(state).nodeStatuses).toEqual({
      "search-1": "failed",
      "prompt-1": "skipped",
    });
  });
});
