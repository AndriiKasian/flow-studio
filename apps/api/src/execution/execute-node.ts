import type {
  WorkflowGraph,
  WorkflowNodeType,
} from "@flow-studio/shared";

import type { NodeInput } from "./collect-node-inputs";
import { executePromptTemplate } from "./executor/prompt-template";
import { executeTextInput } from "./executor/text-input";
import { executeTextOutput } from "./executor/text-output";
import { executeTextTransform } from "./executor/text-transform";
import type { NodeExecutionResult } from "./types";

type WorkflowNode = WorkflowGraph["nodes"][number];

type NodeExecutor = (
  node: WorkflowNode,
  inputs: NodeInput[],
) => NodeExecutionResult | Promise<NodeExecutionResult>;

const executors: Partial<Record<WorkflowNodeType, NodeExecutor>> = {
  textInput: executeTextInput,
  textTransform: executeTextTransform,
  promptTemplate: executePromptTemplate,
  textOutput: executeTextOutput,
};

export async function executeNode(
  node: WorkflowNode,
  inputs: NodeInput[],
): Promise<NodeExecutionResult> {
  const executor = executors[node.type];

  if (!executor) {
    return {
      status: "failed",
      error: `Executor for node type "${node.type}" is not implemented`,
    };
  }

  return executor(node, inputs);
}
