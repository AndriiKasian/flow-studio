
import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

export function executeTextInput(
  node: WorkflowNode,
): NodeExecutionResult {
  if (node.type !== "textInput") {
    return {
      status: "failed",
      error: `Expected textInput node, received "${node.type}"`,
    };
  }

  if (typeof node.data.text !== "string") {
    return {
      status: "failed",
      error: "Text Input node requires a string in data.text",
    };
  }

  return {
    status: "completed",
    outputs: {
      text: node.data.text,
    },
  };
}
