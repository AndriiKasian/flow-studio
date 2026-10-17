import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import { validateGraph } from "../validate-graph";

function createGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "node-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "node-2",
        type: "textOutput",
        position: { x: 200, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "node-1",
        sourceHandle: "text",
        target: "node-2",
        targetHandle: "input",
      },
    ],
  };
}

describe("validateGraph", () => {
  it("accepts a valid graph", () => {
    expect(validateGraph(createGraph())).toEqual([]);
  });

  it("detects a missing source node", () => {
    const graph = createGraph();
    graph.edges[0]!.source = "missing-node";

    expect(validateGraph(graph)).toEqual(["invalid"]);
  });

  it("detects a missing target node", () => {
    const graph = createGraph();
    graph.edges[0]!.target = "missing-node";

    expect(validateGraph(graph)).toEqual(["invalid"]);
  });

  it("detects duplicate node IDs", () => {
    const graph = createGraph();
    graph.nodes[1]!.id = "node-1";

    expect(validateGraph(graph)).toEqual(["duplicate"]);
  });

  it("accepts an empty graph", () => {
    expect(validateGraph({ nodes: [], edges: [] })).toEqual([]);
  });

  it("detects a cycle between nodes", () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: "node-1",
          type: "textTransform",
          position: { x: 0, y: 0 },
          data: {},
        },
        {
          id: "node-2",
          type: "promptTemplate",
          position: { x: 200, y: 0 },
          data: { template: "{{input}}" },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          sourceHandle: "output",
          target: "node-2",
          targetHandle: "input",
        },
        {
          id: "edge-2",
          source: "node-2",
          sourceHandle: "prompt",
          target: "node-1",
          targetHandle: "input",
        },
      ],
    };

    expect(validateGraph(graph)).toEqual(["cycle"]);
  });

  it("detects a self-loop", () => {
    const graph = createGraph();

    graph.edges.push({
      id: "edge-2",
      source: "node-1",
      sourceHandle: "text",
      target: "node-1",
      targetHandle: "input",
    });

    expect(validateGraph(graph)).toEqual(["self"]);
  });

  it("accepts a graph with branching", () => {
    const graph = createGraph();

    graph.nodes.push(
      {
        id: "node-3",
        type: "textTransform",
        position: { x: 200, y: 200 },
        data: {},
      },
      {
        id: "node-4",
        type: "textOutput",
        position: { x: 400, y: 200 },
        data: {},
      },
    );

    graph.edges.push(
      {
        id: "edge-2",
        source: "node-1",
        sourceHandle: "text",
        target: "node-3",
        targetHandle: "input",
      },
      {
        id: "edge-3",
        source: "node-3",
        sourceHandle: "output",
        target: "node-4",
        targetHandle: "input",
      },
    );

    expect(validateGraph(graph)).toEqual([]);
  });
});
