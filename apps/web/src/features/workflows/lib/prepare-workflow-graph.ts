import type { Edge, Node } from "@xyflow/react";
import {
  workflowGraphSchema,
  type WorkflowGraph,
} from "@flow-studio/shared";

export function prepareWorkflowGraph(
  nodes: Node[],
  edges: Edge[],
): WorkflowGraph | null {
  const cleanNodes = nodes.map((node) => {
    if (node.type !== "textOutput") {
      return node;
    }

    const data = { ...node.data };
    delete data.result;

    return {
      ...node,
      data,
    };
  });

  const cleanEdges = edges.map((edge) => {
    if (!edge.data) {
      return edge;
    }

    const data = { ...edge.data };
    delete data.status;
    delete data.inactive;

    return {
      ...edge,
      data,
    };
  });

  const result = workflowGraphSchema.safeParse({
    nodes: cleanNodes,
    edges: cleanEdges,
  });

  return result.success ? result.data : null;
}
