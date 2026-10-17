import {
  isActiveInputHandle,
  type WorkflowGraph,
} from "@flow-studio/shared";

export function buildExecutionGraph(
  graph: WorkflowGraph,
): WorkflowGraph {
  const nodesById = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );

  // Edges into inactive Prompt Template ports stay in the stored graph so
  // they can be reactivated, but they do not take part in execution.
  const edges = graph.edges.filter((edge) => {
    const target = nodesById.get(edge.target);

    return !target || isActiveInputHandle(target, edge.targetHandle);
  });

  const connectedNodeIds = new Set<string>();

  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  return {
    nodes: graph.nodes.filter((node) =>
      connectedNodeIds.has(node.id),
    ),
    edges,
  };
}
