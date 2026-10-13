
import { workflowGraphSchema } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

const createNode = (
  type: string,
  data: Record<string, unknown>,
) => ({
  id: "node-1",
  type,
  position: { x: 100, y: 200 },
  data,
});

describe("workflowGraphSchema", () => {
  it("accepts an empty graph", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it("accepts all six node types with empty configurations", () => {
    const types = [
      "userInput",
      "textInput",
      "promptTemplate",
      "llm",
      "textTransform",
      "textOutput",
    ];

    const result = workflowGraphSchema.safeParse({
      nodes: types.map((type, index) => ({
        ...createNode(type, {}),
        id: `node-${index}`,
      })),
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it("preserves valid LLM configuration", () => {
    const node = createNode("llm", {
      model: "claude-sonnet",
      systemPrompt: "You are a helpful assistant.",
      temperature: 0.7,
    });

    const result = workflowGraphSchema.parse({
      nodes: [node],
      edges: [],
    });

    expect(result.nodes[0]?.data).toEqual(node.data);
  });

  it("rejects invalid LLM temperature", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [
        createNode("llm", {
          temperature: "high",
        }),
      ],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects configuration fields belonging to another node type", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [
        createNode("textInput", {
          temperature: 0.7,
        }),
      ],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown node types", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [createNode("unknownNode", {})],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid node positions", () => {
    const result = workflowGraphSchema.safeParse({
      nodes: [
        {
          ...createNode("textInput", {}),
          position: { x: Number.NaN, y: 200 },
        },
      ],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it("preserves node configuration and edge handles", () => {
    const graph = {
      nodes: [
        createNode("textInput", { text: "Hello" }),
        {
          ...createNode("textOutput", {}),
          id: "node-2",
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          target: "node-2",
          sourceHandle: "text",
          targetHandle: "input",
          type: "workflow",
        },
      ],
    };

    const result = workflowGraphSchema.parse(graph);

    expect(result.nodes[0]?.data).toEqual({ text: "Hello" });
    expect(result.edges[0]).toEqual(graph.edges[0]);
  });
});
