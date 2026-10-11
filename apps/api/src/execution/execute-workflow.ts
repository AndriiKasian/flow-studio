
import type { WorkflowGraph } from "@flow-studio/shared";

import { collectNodeInputs } from "./collect-node-inputs";
import { executeNode } from "./execute-node";
import { topologicalSort } from "./topological-sort";
import type { NodeExecutionResult } from "./types";
import { validateGraph } from "./validate-graph";

export interface WorkflowExecutionResult {
  status: "completed" | "failed";
  results: Record<string, NodeExecutionResult>;
  error?: string;
}

export async function executeWorkflow(
  graph: WorkflowGraph,
): Promise<WorkflowExecutionResult> {
  const validationErrors = validateGraph(graph);

  if (validationErrors.length > 0) {
    return {
      status: "failed",
      results: {},
      error: validationErrors.join("; "),
    };
  }

  const results = new Map<string, NodeExecutionResult>();
  const nodesById = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );

  const executionOrder = topologicalSort(graph);

  for (const nodeId of executionOrder) {
    const node = nodesById.get(nodeId);

    if (!node) {
      return {
        status: "failed",
        results: Object.fromEntries(results),
        error: `Node "${nodeId}" not found`,
      };
    }

    try {
      const inputs = collectNodeInputs(
        nodeId,
        graph.edges,
        results,
      );

      const result = await executeNode(node, inputs);

      results.set(nodeId, result);

      if (result.status === "failed") {
        return {
          status: "failed",
          results: Object.fromEntries(results),
          error: `Node "${nodeId}" failed: ${result.error}`,
        };
      }
    } catch (error) {
      return {
        status: "failed",
        results: Object.fromEntries(results),
        error:
          error instanceof Error
            ? error.message
            : "Unknown execution error",
      };
    }
  }

  return {
    status: "completed",
    results: Object.fromEntries(results),
  };
}
