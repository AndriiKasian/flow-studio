import {
  validateImportedWorkflowGraph,
  type WorkflowGraph,
} from "@flow-studio/shared";

export function validateGraph(graph: WorkflowGraph): string[] {
  const error = validateImportedWorkflowGraph(
    graph.nodes,
    graph.edges,
  );

  return error ? [error] : [];
}