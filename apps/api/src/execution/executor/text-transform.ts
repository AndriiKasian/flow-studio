
import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

export function executeTextTransform(
  node: WorkflowNode,
  inputs: NodeInput[],
): NodeExecutionResult {
  if (node.type !== "textTransform") {
    return {
      status: "failed",
      error: `Expected textTransform node, received "${node.type}"`,
    };
  }

  const { operation } = node.data;

  if (!operation) {
    return {
      status: "failed",
      error: "Text Transform requires an operation",
    };
  }

  const input = inputs.find(
    (item) => item.targetHandle === "input",
  );

  if (!input || typeof input.value !== "string") {
    return {
      status: "failed",
      error: "Text Transform requires a string input",
    };
  }

  let output: string;

  if (operation === "trim") {
    output = input.value.trim();
  } else if (operation === "uppercase") {
    output = input.value.toUpperCase();
  } else {
    output = input.value.toLowerCase();
  }

  return {
    status: "completed",
    outputs: { output },
  };
}
