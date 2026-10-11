
import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import { topologicalSort } from "./topological-sort";

function createGraph(
  nodeIds: string[],
  connections: [string, string][],
): WorkflowGraph {
  return {
    nodes: nodeIds.map((id) => ({
      id,
      type: "textInput",
      position: { x: 0, y: 0 },
      data: {},
    })),
    edges: connections.map(([source, target], index) => ({
      id: `edge-${index}`,
      source,
      target,
    })),
  };
}

describe("topologicalSort", () => {
  it("sorts a linear graph", () => {
    const graph = createGraph(
      ["C", "A", "B"],
      [
        ["A", "B"],
        ["B", "C"],
      ],
    );

    expect(topologicalSort(graph)).toEqual(["A", "B", "C"]);
  });

  it("respects dependencies in a branching graph", () => {
    const graph = createGraph(
      ["D", "C", "B", "A"],
      [
        ["A", "B"],
        ["A", "C"],
        ["B", "D"],
        ["C", "D"],
      ],
    );

    const result = topologicalSort(graph);

    expect(result.indexOf("A")).toBeLessThan(result.indexOf("B"));
    expect(result.indexOf("A")).toBeLessThan(result.indexOf("C"));
    expect(result.indexOf("B")).toBeLessThan(result.indexOf("D"));
    expect(result.indexOf("C")).toBeLessThan(result.indexOf("D"));
  });

  it("includes independent nodes", () => {
    const graph = createGraph(["A", "B", "C"], []);

    expect(topologicalSort(graph)).toEqual(["A", "B", "C"]);
  });

  it("handles an empty graph", () => {
    const graph = createGraph([], []);

    expect(topologicalSort(graph)).toEqual([]);
  });

  it("rejects a cyclic graph", () => {
    const graph = createGraph(
      ["A", "B"],
      [
        ["A", "B"],
        ["B", "A"],
      ],
    );

    expect(() => topologicalSort(graph)).toThrow(
      "Cannot sort graph: invalid dependencies or cycle",
    );
  });
});
