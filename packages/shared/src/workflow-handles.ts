
import type { WorkflowNodeType } from "./workflow-graph";

interface NodeHandles {
  inputs: readonly string[];
  outputs: readonly string[];
}

export const WORKFLOW_HANDLES = {
  userInput: { inputs: [], outputs: ["value"] },
  textInput: { inputs: [], outputs: ["text"] },
  promptTemplate: { inputs: [], outputs: ["prompt"] },
  llm: { inputs: ["prompt"], outputs: ["response"] },
  textTransform: { inputs: ["input"], outputs: ["output"] },
  textOutput: { inputs: ["input"], outputs: [] },
  webSearch: { inputs: ["query"], outputs: ["results"] },
  jsonOutput: { inputs: ["input"], outputs: [] },
} as const satisfies Record<WorkflowNodeType, NodeHandles>;

/**
 * Extracts unique variable names from a Prompt Template.
 *
 * Example:
 * "Explain {{topic}} in {{language}}. More about {{topic}}."
 * → ["topic", "language"]
 */
export function extractPromptVariables(template: string): string[] {
  const matches = template.matchAll(
    /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,
  );

  return [...new Set(Array.from(matches, (match) => match[1]!))];
}
