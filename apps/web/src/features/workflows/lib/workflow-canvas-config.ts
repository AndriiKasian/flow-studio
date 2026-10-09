
import type { Node } from "@xyflow/react";

import {
  WorkflowEdge,
  type WorkflowEdgeType,
} from "../components/edges/workflow-edge";

import { UserInputNode } from "../components/nodes/user-input-node";
import { TextInputNode } from "../components/nodes/text-input-node";
import { PromptTemplateNode } from "../components/nodes/prompt-template-node";
import { LlmNode } from "../components/nodes/llm-node";
import { TextTransformNode } from "../components/nodes/text-transform-node";
import { TextOutputNode } from "../components/nodes/text-output-node";

export const NODE_DRAG_TYPE = "application/flow-studio-node";

export const CANVAS_BACKGROUND = {
  gap: 20,
  dotSize: 1,
} as const;

export const nodeTypes = {
  userInput: UserInputNode,
  textInput: TextInputNode,
  promptTemplate: PromptTemplateNode,
  llm: LlmNode,
  textTransform: TextTransformNode,
  textOutput: TextOutputNode,
};

export const edgeTypes = {
  workflow: WorkflowEdge,
};

export const initialNodes: Node[] = [];
export const initialEdges: WorkflowEdgeType[] = [];

export const categoryColors = {
  input: "#3b82f6",
  ai: "#8b5cf6",
  transform: "#10b981",
  output: "#06b6d4",
};
