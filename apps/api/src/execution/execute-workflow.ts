
import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";

import { buildExecutionGraph } from "./build-execution-graph";
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

export type WorkflowEventHandler = (
  event: WorkflowExecutionEvent,
) => void;

export async function executeWorkflow(
  graph: WorkflowGraph,
  onEvent?: WorkflowEventHandler,
): Promise<WorkflowExecutionResult> {
  const results = new Map<string, NodeExecutionResult>();

  const finish = (
    status: "completed" | "failed",
    error?: string,
  ): WorkflowExecutionResult => {
    onEvent?.({
      type: "flow:stop",
      status,
      ...(error ? { error } : {}),
    });

    return {
      status,
      results: Object.fromEntries(results),
      ...(error ? { error } : {}),
    };
  };

  onEvent?.({ type: "flow:start" });

  const executionGraph = buildExecutionGraph(graph);

  if (executionGraph.nodes.length === 0) {
    return finish(
      "failed",
      "Workflow has no connected nodes to execute",
    );
  }

  const validationErrors = validateGraph(executionGraph);

  if (validationErrors.length > 0) {
    return finish("failed", validationErrors.join("; "));
  }

  const nodesById = new Map(
    executionGraph.nodes.map((node) => [node.id, node]),
  );

  const executionOrder = topologicalSort(executionGraph);

  const markRemainingNodesSkipped = (
    failedNodeId: string,
  ) => {
    let shouldSkip = false;

    for (const nodeId of executionOrder) {
      if (nodeId === failedNodeId) {
        shouldSkip = true;
        continue;
      }

      if (!shouldSkip) {
        continue;
      }

      results.set(nodeId, {
        status: "skipped",
      });

      onEvent?.({
        type: "node:stop",
        nodeId,
        status: "skipped",
      });
    }
  };

  for (const nodeId of executionOrder) {
    const node = nodesById.get(nodeId);

    if (!node) {
      return finish("failed", `Node "${nodeId}" not found`);
    }

    onEvent?.({
      type: "node:start",
      nodeId,
    });

    try {
      const inputs = collectNodeInputs(
        nodeId,
        executionGraph.edges,
        results,
      );

      const result = await executeNode(node, inputs);

      results.set(nodeId, result);

      onEvent?.({
        type: "node:stop",
        nodeId,
        status: result.status,
        ...(result.status === "completed"
          ? { outputs: result.outputs }
          : {}),
        ...(result.status === "failed"
          ? { error: result.error }
          : {}),
      });

      if (result.status === "failed") {
        markRemainingNodesSkipped(nodeId);

        return finish(
          "failed",
          `Node "${nodeId}" failed: ${result.error}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown execution error";

      results.set(nodeId, {
        status: "failed",
        error: message,
      });

      onEvent?.({
        type: "node:stop",
        nodeId,
        status: "failed",
        error: message,
      });

      markRemainingNodesSkipped(nodeId);

      return finish("failed", message);
    }
  }

  return finish("completed");
}
