import { workflowGraphSchema, type WorkflowGraph } from "./workflow-graph";

// Fields written by earlier versions that are no longer part of the node schema.
const DEPRECATED_NODE_FIELDS: Partial<Record<string, readonly string[]>> = {
  textOutput: ["result"],
  llm: ["model", "temperature"],
};

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
      typeof node.type !== "string" ||
      !("data" in node) ||
      typeof node.data !== "object" ||
      node.data === null ||
      Array.isArray(node.data)
    ) {
      return node;
    }

    const deprecatedFields = DEPRECATED_NODE_FIELDS[node.type];

    if (!deprecatedFields) {
      return node;
    }

    const data: Record<string, unknown> = { ...node.data };

    for (const field of deprecatedFields) {
      delete data[field];
    }

    return { ...node, data };
  });

  const graph = {
    ...input,
    nodes,
  };

  const result = workflowGraphSchema.safeParse(graph);

  return result.success ? result.data : null;
}
