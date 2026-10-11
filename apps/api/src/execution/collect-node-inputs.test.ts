
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import { collectNodeInputs } from "./collect-node-inputs";
import type { NodeExecutionResult } from "./types";

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
});
