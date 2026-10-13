
import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import { buildExecutionGraph } from "../build-execution-graph";

describe("buildExecutionGraph", () => {
  it("excludes isolated nodes", () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: "input",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
        {
          id: "transform",
          type: "textTransform",
          position: { x: 100, y: 0 },
          data: { operation: "uppercase" },
        },
        {
          id: "output",
          type: "textOutput",
          position: { x: 200, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input",
          target: "transform",
        },
      ],
    };

    const result = buildExecutionGraph(graph);

    expect(result.nodes.map((node) => node.id)).toEqual([
      "input",
      "transform",
    ]);

    expect(result.edges).toEqual(graph.edges);

    // The original canvas graph must remain unchanged.
    expect(graph.nodes).toHaveLength(3);
  });

  it("returns an empty execution graph when there are no edges", () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: "input",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
      ],
      edges: [],
    };

    expect(buildExecutionGraph(graph)).toEqual({
      nodes: [],
      edges: [],
    });
  });

  it("keeps all nodes that participate in connections", () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: "input",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello" },
        },
        {
          id: "transform",
          type: "textTransform",
          position: { x: 100, y: 0 },
          data: { operation: "uppercase" },
        },
        {
          id: "output",
          type: "textOutput",
          position: { x: 200, y: 0 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input",
          target: "transform",
        },
        {
          id: "edge-2",
          source: "transform",
          target: "output",
        },
      ],
    };

    const result = buildExecutionGraph(graph);

    expect(result.nodes).toEqual(graph.nodes);
    expect(result.edges).toEqual(graph.edges);
  });
});
