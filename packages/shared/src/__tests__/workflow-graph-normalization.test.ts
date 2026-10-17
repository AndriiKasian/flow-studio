import { describe, expect, it } from "vitest";

import { normalizeWorkflowGraph } from "../workflow-graph-normalization.js";

describe("normalizeWorkflowGraph", () => {
  const graph = {
    nodes: [
      {
        id: "input-1",
        type: "textInput",
        position: { x: 100, y: 200 },
        data: { text: "Hello world" },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 400, y: 200 },
        data: { result: "Previous execution result" },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        target: "output-1",
        sourceHandle: "text",
        targetHandle: "input",
        type: "workflow",
      },
    ],
  };

  it("removes legacy Text Output results", () => {
    const result = normalizeWorkflowGraph(graph);

    expect(result).not.toBeNull();
    expect(result?.nodes[1]?.data).toEqual({});
    expect(result?.nodes[0]?.data).toEqual({
      text: "Hello world",
    });
    expect(result?.edges).toEqual(graph.edges);
  });

  it("does not mutate the original graph", () => {
    normalizeWorkflowGraph(graph);

    expect(graph.nodes[1]?.data).toEqual({
      result: "Previous execution result",
    });
  });

  it("preserves valid graphs", () => {
    const validGraph = {
      nodes: [
        {
          id: "output-1",
          type: "textOutput",
          position: { x: 0, y: 0 },
          data: {},
        },
      ],
      edges: [],
    };

    expect(normalizeWorkflowGraph(validGraph)).toEqual(validGraph);
  });

  it("rejects invalid node configurations", () => {
    const invalidGraph = {
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: 123 },
        },
      ],
      edges: [],
    };

    expect(normalizeWorkflowGraph(invalidGraph)).toBeNull();
  });

  it("rejects malformed graphs", () => {
    expect(normalizeWorkflowGraph(null)).toBeNull();
    expect(normalizeWorkflowGraph({})).toBeNull();
    expect(normalizeWorkflowGraph({ nodes: "invalid" })).toBeNull();
  });
});
