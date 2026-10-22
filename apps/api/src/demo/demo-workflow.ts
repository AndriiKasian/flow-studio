
import type { WorkflowGraph } from "@flow-studio/shared";

export function createDemoWorkflow(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "demo-text-input",
        type: "textInput",
        position: { x: 20, y: 120 },
        data: {
          text: "React 19 new features",
        },
      },
      {
        id: "demo-web-search",
        type: "webSearch",
        position: { x: 240, y: 520 },
        data: {},
      },
      {
        id: "demo-prompt-template",
        type: "promptTemplate",
        position: { x: 610, y: 50 },
        data: {
          template:
            "Research topic:\n{{topic}}\n\n" +
            "Web search results:\n{{results}}\n\n" +
            "Write a concise, accurate summary of the key features " +
            "related to the research topic. Include relevant source " +
            "URLs where available. Do not invent facts or sources.",
        },
      },
      {
        id: "demo-llm",
        type: "llm",
        position: { x: 1050, y: 310 },
        data: {
          systemPrompt:
            "You are a technical research assistant. Provide an accurate, concise summary based on the supplied search results. Do not invent facts or source URLs.",
        },
      },
      {
        id: "demo-text-output",
        type: "textOutput",
        position: { x: 1490, y: 90 },
        data: {},
      },
      {
        id: "demo-json-output",
        type: "jsonOutput",
        position: { x: 1490, y: 530 },
        data: {},
      },
    ],
    edges: [
      {
        id: "demo-edge-input-search",
        source: "demo-text-input",
        sourceHandle: "text",
        target: "demo-web-search",
        targetHandle: "query",
      },
      {
        id: "demo-edge-input-prompt",
        source: "demo-text-input",
        sourceHandle: "text",
        target: "demo-prompt-template",
        targetHandle: "topic",
      },
      {
        id: "demo-edge-search-prompt",
        source: "demo-web-search",
        sourceHandle: "results",
        target: "demo-prompt-template",
        targetHandle: "results",
      },
      {
        id: "demo-edge-prompt-llm",
        source: "demo-prompt-template",
        sourceHandle: "prompt",
        target: "demo-llm",
        targetHandle: "prompt",
      },
      {
        id: "demo-edge-llm-text",
        source: "demo-llm",
        sourceHandle: "response",
        target: "demo-text-output",
        targetHandle: "input",
      },
      {
        id: "demo-edge-llm-json",
        source: "demo-llm",
        sourceHandle: "response",
        target: "demo-json-output",
        targetHandle: "input",
      },
    ],
  };
}
