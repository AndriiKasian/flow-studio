export {
  isWorkflowNodeType,
  validateWorkflowConnection,
  validateImportedWorkflowGraph,
  type ConnectionError,
  type WorkflowGraphValidationError,
} from "@flow-studio/shared";

import type { ConnectionError } from "@flow-studio/shared";

export const connectionErrorMessages: Record<
  ConnectionError,
  string
> = {
  self: "A node cannot connect to itself.",
  invalid: "These handles cannot be connected.",
  occupied: "This input already has a connection.",
  cycle: "Circular connections are not allowed.",
};