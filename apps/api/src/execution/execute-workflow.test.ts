
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import { executeWorkflow } from "./execute-workflow";

function createGraph(
  operation?: "trim" | "uppercase" | "lowercase",
): WorkflowGraph {
  return {
    nodes: [
      {
        id: "text-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: "  Hello World  " },
      },
      {
        id: "transform-1",
        type: "textTransform",
        position: { x: 200, y: 0 },
        data: { operation },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 400, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "text-1",
        sourceHandle: "text",
        target: "transform-1",
        targetHandle: "input",
      },
      {
        id: "edge-2",
        source: "transform-1",
        sourceHandle: "output",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  };
}

describe("executeWorkflow", () => {
  it("executes a complete workflow", async () => {
    const result = await executeWorkflow(
      createGraph("uppercase"),
    );

    expect(result.status).toBe("completed");

    expect(result.results["text-1"]).toEqual({
      status: "completed",
      outputs: { text: "  Hello World  " },
    });

    expect(result.results["transform-1"]).toEqual({
      status: "completed",
      outputs: { output: "  HELLO WORLD  " },
    });

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: { result: "  HELLO WORLD  " },
    });
  });

  it("stops when a node has invalid configuration", async () => {
    const result = await executeWorkflow(createGraph());

    expect(result.status).toBe("failed");
    expect(result.error).toContain(
      "Text Transform requires an operation",
    );

    expect(result.results["text-1"]?.status).toBe("completed");
    expect(result.results["transform-1"]?.status).toBe("failed");
    expect(result.results["output-1"]).toBeUndefined();
  });

  it("rejects an invalid graph before execution", async () => {
    const graph = createGraph("trim");

    graph.edges[0]!.sourceHandle = "invalid";

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("failed");
    expect(result.results).toEqual({});
  });


  it("executes independent branches from one source", async () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "Hello World" },
        },
        {
          id: "upper-1",
          type: "textTransform",
          position: { x: 200, y: -100 },
          data: { operation: "uppercase" },
        },
        {
          id: "lower-1",
          type: "textTransform",
          position: { x: 200, y: 100 },
          data: { operation: "lowercase" },
        },
        {
          id: "output-upper",
          type: "textOutput",
          position: { x: 400, y: -100 },
          data: {},
        },
        {
          id: "output-lower",
          type: "textOutput",
          position: { x: 400, y: 100 },
          data: {},
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          sourceHandle: "text",
          target: "upper-1",
          targetHandle: "input",
        },
        {
          id: "edge-2",
          source: "input-1",
          sourceHandle: "text",
          target: "lower-1",
          targetHandle: "input",
        },
        {
          id: "edge-3",
          source: "upper-1",
          sourceHandle: "output",
          target: "output-upper",
          targetHandle: "input",
        },
        {
          id: "edge-4",
          source: "lower-1",
          sourceHandle: "output",
          target: "output-lower",
          targetHandle: "input",
        },
      ],
    };

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("completed");
    expect(Object.keys(result.results)).toHaveLength(5);

    expect(result.results["upper-1"]).toEqual({
      status: "completed",
      outputs: { output: "HELLO WORLD" },
    });

    expect(result.results["lower-1"]).toEqual({
      status: "completed",
      outputs: { output: "hello world" },
    });

    expect(result.results["output-upper"]).toEqual({
      status: "completed",
      outputs: { result: "HELLO WORLD" },
    });

    expect(result.results["output-lower"]).toEqual({
      status: "completed",
      outputs: { result: "hello world" },
    });
  });
});
