import type { ExecutionOutcome } from "./execution-stream";

export const WORKFLOW_EXECUTION_SUCCESS_MESSAGE =
  "Workflow executed successfully";

export const WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE =
  "Connection lost before the workflow finished, so its result is unknown. Please run it again.";

interface ExecutionNotificationHandlers {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// Shared by the editor and the Demo so every execution ends with exactly one
// notification, worded the same way on both screens.
export function notifyExecutionOutcome(
  outcome: ExecutionOutcome,
  { onSuccess, onError }: ExecutionNotificationHandlers,
): void {
  switch (outcome.status) {
    case "completed":
      onSuccess(WORKFLOW_EXECUTION_SUCCESS_MESSAGE);
      return;
    case "failed":
    case "rejected":
      onError(outcome.error);
      return;
    case "interrupted":
      onError(WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE);
      return;
  }
}
