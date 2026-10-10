
import {
  workflowGraphSchema,
  type WorkflowGraph,
} from "@flow-studio/shared";

import { validateImportedWorkflowGraph } from "./workflow-connection";

export function exportWorkflowToFile(
  graph: WorkflowGraph,
  filename: string,
): void {
  const blob = new Blob([JSON.stringify(graph, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function importWorkflowFromFile(
  file: File,
): Promise<WorkflowGraph> {
  const content = await file.text();

  let json: unknown;

  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const result = workflowGraphSchema.safeParse(json);

  if (!result.success) {
    throw new Error("Invalid workflow file structure.");
  }

  const graph = result.data;

  const connectionError = validateImportedWorkflowGraph(
    graph.nodes,
    graph.edges,
  );

  if (connectionError) {
    throw new Error(
      `Invalid workflow connections: ${connectionError}.`,
    );
  }

  return graph;
}
