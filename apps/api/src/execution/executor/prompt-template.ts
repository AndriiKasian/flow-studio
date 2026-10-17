import {
  extractPromptVariables,
  getActivePromptTemplateInputs,
  type WorkflowGraph,
} from "@flow-studio/shared";

import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

export function executePromptTemplate(
  node: WorkflowNode,
  inputs: NodeInput[],
): NodeExecutionResult {
  if (node.type !== "promptTemplate") {
    return {
      status: "failed",
      error: `Expected promptTemplate node, received "${node.type}"`,
    };
  }

  const { template = "", inputs: ports } = node.data;

  if (!template.trim()) {
    return {
      status: "failed",
      error: "Prompt Template requires a non-empty template",
    };
  }

  const variables = extractPromptVariables(template);
  const activePorts = getActivePromptTemplateInputs(template, ports);
  const values = new Map<string, string>();

  for (const variable of variables) {
    const portId = activePorts.find(
      (port) => port.name === variable,
    )?.id;

    const input = inputs.find(
      (item) => item.targetHandle === portId,
    );

    if (!input || typeof input.value !== "string") {
      return {
        status: "failed",
        error: `Prompt Template requires a string input for "${variable}"`,
      };
    }

    values.set(variable, input.value);
  }

  const prompt = template.replace(
    /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
    (placeholder: string, variable: string) =>
      values.get(variable) ?? placeholder,
  );

  return {
    status: "completed",
    outputs: { prompt },
  };
}
