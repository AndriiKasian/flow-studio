
import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeExecutionResult } from "./types";

export interface NodeInput {
  sourceNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  value: unknown;
}

export function collectNodeInputs(
  nodeId: string,
  edges: WorkflowGraph["edges"],
  results: ReadonlyMap<string, NodeExecutionResult>,
): NodeInput[] {
  const inputs: NodeInput[] = [];

  for (const edge of edges) {
    if (edge.target !== nodeId) {
      continue;
    }

    const result = results.get(edge.source);

    if (!result) {
      throw new Error(
        `Source node "${edge.source}" has no execution result`,
      );
    }

    if (result.status === "skipped") {
      continue;
    }

    if (result.status === "failed") {
      throw new Error(
        `Source node "${edge.source}" failed: ${result.error}`,
      );
    }

    const { sourceHandle, targetHandle } = edge;

    if (!sourceHandle || !targetHandle) {
      throw new Error(
        `Edge "${edge.id}" requires source and target handles`,
      );
    }

    if (
      result.activeHandles &&
      !result.activeHandles.includes(sourceHandle)
    ) {
      continue;
    }

    if (!Object.hasOwn(result.outputs, sourceHandle)) {
      throw new Error(
        `Source node "${edge.source}" has no output "${sourceHandle}"`,
      );
    }

    inputs.push({
      sourceNodeId: edge.source,
      sourceHandle,
      targetHandle,
      value: result.outputs[sourceHandle],
    });
  }

  return inputs;
}
