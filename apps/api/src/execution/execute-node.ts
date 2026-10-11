
import type {
  WorkflowGraph,
  WorkflowNodeType,
} from "@flow-studio/shared";

import { executeTextInput } from "./executor/text-input";
import type { NodeExecutionResult } from "./types";

type WorkflowNode = WorkflowGraph["nodes"][number];

type NodeExecutor = (
  node: WorkflowNode,
) => NodeExecutionResult | Promise<NodeExecutionResult>;

const executors = {
  textInput: executeTextInput,
} satisfies Partial<Record<WorkflowNodeType, NodeExecutor>>;

export async function executeNode(
  node: WorkflowNode,
): Promise<NodeExecutionResult> {
  const executor: NodeExecutor | undefined = executors[
    node.type as keyof typeof executors
  ];

  if (!executor) {
    return {
      status: "failed",
      error: `Executor for node type "${node.type}" is not implemented`,
    };
  }

  return executor(node);
}
