import type { WorkflowNodeType } from "@flow-studio/shared";

import {
  Braces,
  Cpu,
  FileJson,
  FileOutput,
  Globe,
  Keyboard,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

type NodeCategory = "input" | "ai" | "tools" | "transform" | "output";

interface NodeDefinition {
  label: string;
  category: NodeCategory;
  description: string;
  icon: LucideIcon;
}

export const NODE_DEFINITIONS = {
  userInput: {
    label: "User Input",
    category: "input",
    description: "Provide a value when running the workflow.",
    icon: Keyboard,
  },
  textInput: {
    label: "Text Input",
    category: "input",
    description: "Provide static text to the workflow.",
    icon: Type,
  },
  promptTemplate: {
    label: "Prompt Template",
    category: "ai",
    description: "Build a prompt using input variables.",
    icon: Braces,
  },
  llm: {
    label: "LLM",
    category: "ai",
    description: "Generate text using an AI model.",
    icon: Cpu,
  },
  webSearch: {
    label: "Web Search",
    category: "input",
    description: "Search the web for relevant information.",
    icon: Globe,
  },
  textTransform: {
    label: "Text Transform",
    category: "transform",
    description: "Transform text using simple operations.",
    icon: WandSparkles,
  },
  textOutput: {
    label: "Text Output",
    category: "output",
    description: "Display the final text result.",
    icon: FileOutput,
  },
  jsonOutput: {
    label: "JSON Output",
    category: "output",
    description: "Display the final result as structured JSON.",
    icon: FileJson,
  },
} satisfies Record<WorkflowNodeType, NodeDefinition>;

export type { WorkflowNodeType };