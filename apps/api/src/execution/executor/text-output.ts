
import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

export function executeTextOutput(
  node: WorkflowNode,
  inputs: NodeInput[],
): NodeExecutionResult {
  if (node.type !== "textOutput") {
    return {
      status: "failed",
      error: `Expected textOutput node, received "${node.type}"`,
    };
  }

  const input = inputs.find(
    (item) => item.targetHandle === "input",
  );

  if (!input || typeof input.value !== "string") {
    return {
      status: "failed",
      error: "Text Output requires a string input",
    };
  }

  return {
    status: "completed",
    outputs: {
      result: input.value,
    },
  };
}
