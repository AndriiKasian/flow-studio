import { workflowGraphSchema, type WorkflowGraph } from "./workflow-graph";

export function normalizeWorkflowGraph(
  input: unknown,
): WorkflowGraph | null {
  if (
    typeof input !== "object" ||
    input === null ||
    !("nodes" in input) ||
    !Array.isArray(input.nodes)
  ) {
    return null;
  }

  const nodes = input.nodes.map((node: unknown) => {
    if (
      typeof node !== "object" ||
      node === null ||
      !("type" in node) ||
      node.type !== "textOutput" ||
      !("data" in node) ||
      typeof node.data !== "object" ||
      node.data === null ||
      Array.isArray(node.data)
    ) {
      return node;
    }

    const data: Record<string, unknown> = { ...node.data };
    delete data.result;

    return { ...node, data };
  });

  const graph = {
    ...input,
    nodes,
  };

  const result = workflowGraphSchema.safeParse(graph);

  return result.success ? result.data : null;
}
