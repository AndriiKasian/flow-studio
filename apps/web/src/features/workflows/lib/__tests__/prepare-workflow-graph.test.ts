import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { prepareWorkflowGraph } from "../prepare-workflow-graph";

// Canvas state as held by useWorkflowCanvas: edges created through
// onConnect carry `status: "idle"`, Text Output data has no result.
const canvasNodes: Node[] = [
  {
    id: "input",
    type: "textInput",
    position: { x: 0, y: 0 },
    data: { text: "hello" },
  },
  {
    id: "output",
    type: "textOutput",
    position: { x: 300, y: 0 },
    data: {},
  },
];

const canvasEdges: Edge[] = [
  {
    id: "edge",
    source: "input",
    target: "output",
    sourceHandle: "output",
    targetHandle: "input",
    type: "workflow",
    data: { color: "#000", status: "idle" },
  },
];

// What WorkflowCanvas renders (and getNodes()/getEdges() return) after a
// completed run.
const displayNodes: Node[] = canvasNodes.map((node) =>
  node.type === "textOutput"
    ? {
        ...node,
        className: "workflow-status-completed",
        data: { ...node.data, result: "HELLO" },
      }
    : node,
);

const displayEdges: Edge[] = canvasEdges.map((edge) => ({
  ...edge,
  data: { ...edge.data, status: "completed", inactive: false },
}));

const expectedGraph = {
  nodes: [
    {
      id: "input",
      type: "textInput",
      position: { x: 0, y: 0 },
      data: { text: "hello" },
    },
    {
      id: "output",
      type: "textOutput",
      position: { x: 300, y: 0 },
      data: {},
    },
  ],
  edges: [
    {
      id: "edge",
      source: "input",
      target: "output",
      sourceHandle: "output",
      targetHandle: "input",
      type: "workflow",
      data: { color: "#000" },
    },
  ],
};

describe("prepareWorkflowGraph", () => {
  it("prepares the Run graph from canvas state", () => {
    expect(prepareWorkflowGraph(canvasNodes, canvasEdges)).toEqual(
      expectedGraph,
    );
  });

  it("strips runtime result and status from display projections", () => {
    expect(prepareWorkflowGraph(displayNodes, displayEdges)).toEqual(
      expectedGraph,
    );
  });

  it("rejects invalid node configuration", () => {
    const nodes: Node[] = [
      {
        ...canvasNodes[0],
        data: { text: "hello", unknown: true },
      },
    ];

    expect(prepareWorkflowGraph(nodes, [])).toBeNull();
  });
});
