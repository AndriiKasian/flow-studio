import type { WorkflowExecutionStatus } from "./workflow-execution-status";

export function getWorkflowNodeClassName(
  className: string | undefined,
  status: WorkflowExecutionStatus,
): string | undefined {
  const baseClassName = (className ?? "")
    .split(/\s+/)
    .filter(
      (name) =>
        name.length > 0 &&
        !name.startsWith("workflow-status-"),
    )
    .join(" ");

  if (status === "idle") {
    return baseClassName || undefined;
  }

  return [baseClassName, `workflow-status-${status}`]
    .filter(Boolean)
    .join(" ");
}
