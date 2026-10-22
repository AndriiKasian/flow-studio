import type {
  WorkflowGraph,
  WorkflowNodeType,
} from "@flow-studio/shared";

import type { NodeInput } from "./collect-node-inputs";
import { executeJsonOutput } from "./executor/json-output";
import { executeLlm } from "./executor/llm";
import { executePromptTemplate } from "./executor/prompt-template";
import { executeTextInput } from "./executor/text-input";
import { executeTextOutput } from "./executor/text-output";
import { executeTextTransform } from "./executor/text-transform";
import { executeWebSearch } from "./executor/web-search";
import type { NodeExecutionResult } from "./types";

type WorkflowNode = WorkflowGraph["nodes"][number];

type NodeExecutor = (
  node: WorkflowNode,
  inputs: NodeInput[],
  signal?: AbortSignal,
) => NodeExecutionResult | Promise<NodeExecutionResult>;

const MAX_PUBLIC_OUTPUT_LENGTH = 20_000;

// Deterministic, free node types allowed in public workflow execution.
export const PUBLIC_NODE_TYPES: ReadonlySet<WorkflowNodeType> = new Set<WorkflowNodeType>([
  "textInput",
  "textTransform",
  "promptTemplate",
  "textOutput",
  "jsonOutput",
]);

const executors: Partial<Record<WorkflowNodeType, NodeExecutor>> = {
  textInput: executeTextInput,
  textTransform: executeTextTransform,
  promptTemplate: executePromptTemplate,
  llm: executeLlm,
  textOutput: executeTextOutput,
  webSearch: executeWebSearch,
  jsonOutput: executeJsonOutput,
};

export async function executeNode(
  node: WorkflowNode,
  inputs: NodeInput[],
  signal?: AbortSignal,
): Promise<NodeExecutionResult> {
  if (signal?.aborted) {
    return {
      status: "failed",
      error: "Workflow execution was cancelled",
    };
  }

  const executor = executors[node.type];

  if (!executor) {
    return {
      status: "failed",
      error: `Executor for node type "${node.type}" is not implemented`,
    };
  }

  const result = await executor(node, inputs, signal);

  if (
    PUBLIC_NODE_TYPES.has(node.type) &&
    result.status === "completed"
  ) {
    const outputSize = JSON.stringify(result.outputs).length;

    if (outputSize > MAX_PUBLIC_OUTPUT_LENGTH) {
      return {
        status: "failed",
        error: "Node output exceeds the maximum allowed size",
      };
    }
  }

  return result;
}
