
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
