import type { WorkflowNodeType } from "./workflow-graph";

interface NodeHandles {
  inputs: readonly string[];
  outputs: readonly string[];
}

export const WORKFLOW_HANDLES = {
  userInput: { inputs: [], outputs: ["value"] },
  textInput: { inputs: [], outputs: ["text"] },
  promptTemplate: { inputs: ["input"], outputs: ["prompt"] },
  llm: { inputs: ["prompt"], outputs: ["response"] },
  textTransform: { inputs: ["input"], outputs: ["output"] },
  textOutput: { inputs: ["input"], outputs: [] },
} as const satisfies Record<WorkflowNodeType, NodeHandles>;