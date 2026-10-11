
import type { WorkflowGraph } from "@flow-studio/shared";

export function topologicalSort(graph: WorkflowGraph): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);

    inDegree.set(
      edge.target,
      (inDegree.get(edge.target) ?? 0) + 1,
    );
  }

  const queue: string[] = [];

  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  let index = 0;

  while (index < queue.length) {
    const nodeId = queue[index++]!;

    result.push(nodeId);

    for (const nextId of adjacency.get(nodeId) ?? []) {
      const degree = inDegree.get(nextId)! - 1;

      inDegree.set(nextId, degree);

      if (degree === 0) {
        queue.push(nextId);
      }
    }
  }

  if (result.length !== graph.nodes.length) {
    throw new Error("Cannot sort graph: invalid dependencies or cycle");
  }

  return result;
}
