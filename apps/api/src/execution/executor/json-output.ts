import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

const MAX_JSON_LENGTH = 20_000;

export function executeJsonOutput(
  node: WorkflowNode,
  inputs: NodeInput[],
): NodeExecutionResult {
  if (node.type !== "jsonOutput") {
    return {
      status: "failed",
      error: `Expected jsonOutput node, received "${node.type}"`,
    };
  }

  const input = inputs.find(
    (item) => item.targetHandle === "input",
  );

  if (!input || typeof input.value !== "string") {
    return {
      status: "failed",
      error: "JSON Output requires a string input",
    };
  }

  const text = input.value.trim();

  if (!text) {
    return {
      status: "failed",
      error: "JSON Output requires a non-empty input",
    };
  }

  if (text.length > MAX_JSON_LENGTH) {
    return {
      status: "failed",
      error: "JSON Output exceeds the maximum allowed length",
    };
  }

  let result: Record<string, unknown>;

  try {
    const parsed: unknown = JSON.parse(text);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      result = parsed as Record<string, unknown>;
    } else {
      result = { result: parsed };
    }
  } catch {
    result = { result: text };
  }

  return {
    status: "completed",
    outputs: {
      result,
    },
  };
}
