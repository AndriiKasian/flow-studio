
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

export type WorkflowExecutionStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type WorkflowExecutionState = {
  nodeStatuses: Record<string, WorkflowExecutionStatus>;
  nodeOutputs: Record<string, Record<string, unknown>>;
};

export const initialWorkflowExecutionState: WorkflowExecutionState = {
  nodeStatuses: {},
  nodeOutputs: {},
};

export function applyWorkflowExecutionEvent(
  state: WorkflowExecutionState,
  event: WorkflowExecutionEvent,
): WorkflowExecutionState {
  switch (event.type) {
    case "flow:start":
      return initialWorkflowExecutionState;

    case "node:start":
      return {
        ...state,
        nodeStatuses: {
          ...state.nodeStatuses,
          [event.nodeId]: "running",
        },
      };

    case "node:stop":
      return {
        nodeStatuses: {
          ...state.nodeStatuses,
          [event.nodeId]: event.status,
        },
        nodeOutputs: {
          ...state.nodeOutputs,
          ...(event.status === "completed" && event.outputs
            ? { [event.nodeId]: event.outputs }
            : {}),
        },
      };

    case "flow:stop":
      return state;
  }
}

// Used when the execution stream ends without flow:stop, so no node
// can be left running indefinitely.
export function failRunningNodes(
  state: WorkflowExecutionState,
): WorkflowExecutionState {
  const runningNodeIds = Object.keys(state.nodeStatuses).filter(
    (nodeId) => state.nodeStatuses[nodeId] === "running",
  );

  if (runningNodeIds.length === 0) {
    return state;
  }

  const nodeStatuses = { ...state.nodeStatuses };

  for (const nodeId of runningNodeIds) {
    nodeStatuses[nodeId] = "failed";
  }

  return { ...state, nodeStatuses };
}
