
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import { collectNodeInputs } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

describe("collectNodeInputs", () => {
  it("rejects edges without explicit handles", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        target: "B",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      [
        "A",
        {
          status: "completed",
          outputs: { output: "hello" },
        },
      ],
    ]);

    expect(() => collectNodeInputs("B", edges, results)).toThrow(
      'Edge "edge-1" requires source and target handles',
    );
  });


  it("delivers one source output to multiple target nodes", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "B",
        targetHandle: "input",
      },
      {
        id: "edge-2",
        source: "A",
        sourceHandle: "text",
        target: "C",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      ["A", { status: "completed", outputs: { text: "hello" } }],
    ]);

    expect(collectNodeInputs("B", edges, results)).toEqual([
      {
        sourceNodeId: "A",
        sourceHandle: "text",
        targetHandle: "input",
        value: "hello",
      },
    ]);

    expect(collectNodeInputs("C", edges, results)).toEqual([
      {
        sourceNodeId: "A",
        sourceHandle: "text",
        targetHandle: "input",
        value: "hello",
      },
    ]);
  });

  it("collects inputs from multiple source nodes", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "C",
        targetHandle: "first",
      },
      {
        id: "edge-2",
        source: "B",
        sourceHandle: "output",
        target: "C",
        targetHandle: "second",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      ["A", { status: "completed", outputs: { text: "hello" } }],
      ["B", { status: "completed", outputs: { output: "world" } }],
    ]);

    expect(collectNodeInputs("C", edges, results)).toEqual([
      {
        sourceNodeId: "A",
        sourceHandle: "text",
        targetHandle: "first",
        value: "hello",
      },
      {
        sourceNodeId: "B",
        sourceHandle: "output",
        targetHandle: "second",
        value: "world",
      },
    ]);
  });

  it("ignores skipped source nodes", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "B",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      ["A", { status: "skipped" }],
    ]);

    expect(collectNodeInputs("B", edges, results)).toEqual([]);
  });

  it("collects outputs only from active handles", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "true",
        target: "B",
        targetHandle: "input",
      },
      {
        id: "edge-2",
        source: "A",
        sourceHandle: "false",
        target: "C",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      [
        "A",
        {
          status: "completed",
          outputs: { true: "yes", false: "no" },
          activeHandles: ["true"],
        },
      ],
    ]);

    expect(collectNodeInputs("B", edges, results)).toEqual([
      {
        sourceNodeId: "A",
        sourceHandle: "true",
        targetHandle: "input",
        value: "yes",
      },
    ]);

    expect(collectNodeInputs("C", edges, results)).toEqual([]);
  });

  it("rejects missing source execution results", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "B",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>();

    expect(() => collectNodeInputs("B", edges, results)).toThrow(
      'Source node "A" has no execution result',
    );
  });

  it("rejects failed source nodes", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "B",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      ["A", { status: "failed", error: "Execution failed" }],
    ]);

    expect(() => collectNodeInputs("B", edges, results)).toThrow(
      'Source node "A" failed: Execution failed',
    );
  });

  it("rejects missing source output handles", () => {
    const edges: WorkflowGraph["edges"] = [
      {
        id: "edge-1",
        source: "A",
        sourceHandle: "text",
        target: "B",
        targetHandle: "input",
      },
    ];

    const results = new Map<string, NodeExecutionResult>([
      ["A", { status: "completed", outputs: { other: "hello" } }],
    ]);

    expect(() => collectNodeInputs("B", edges, results)).toThrow(
      'Source node "A" has no output "text"',
    );
  });
});
