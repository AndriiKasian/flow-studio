
import type { WorkflowExecutionStatus } from "./workflow-execution-status";
import type { WorkflowEdgeStatus } from "../components/edges/workflow-edge";

export function getWorkflowEdgeStatus(
  sourceStatus: WorkflowExecutionStatus,
  targetStatus: WorkflowExecutionStatus,
): WorkflowEdgeStatus {
  if (targetStatus === "skipped") {
    return "skipped";
  }

  if (targetStatus === "failed") {
    return "failed";
  }

  if (targetStatus === "running") {
    return "running";
  }

  if (
    sourceStatus === "completed" &&
    targetStatus === "completed"
  ) {
    return "completed";
  }

  return "idle";
}
