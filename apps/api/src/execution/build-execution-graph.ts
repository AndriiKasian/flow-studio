import type { WorkflowGraph } from "@flow-studio/shared";

export function buildExecutionGraph(
  graph: WorkflowGraph,
): WorkflowGraph {
  const connectedNodeIds = new Set<string>();

  for (const edge of graph.edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  return {
    nodes: graph.nodes.filter((node) =>
      connectedNodeIds.has(node.id),
    ),
    edges: graph.edges,
  };
}
