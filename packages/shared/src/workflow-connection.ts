import {
  getActivePromptTemplateInputs,
  type PromptTemplateInput,
} from "./prompt-template-inputs";
import {
  extractPromptVariables,
  WORKFLOW_HANDLES,
} from "./workflow-handles";
import type { WorkflowNodeType } from "./workflow-graph";

export type ConnectionError =
  | "self"
  | "invalid"
  | "occupied"
  | "cycle";

export type WorkflowGraphValidationError =
  | ConnectionError
  | "duplicate";

export interface ConnectionNode {
  id: string;
  type?: string;
  data?: unknown;
}

export interface ConnectionEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export function isWorkflowNodeType(
  value: string,
): value is WorkflowNodeType {
  return Object.hasOwn(WORKFLOW_HANDLES, value);
}

function getInputHandles(node: ConnectionNode): readonly string[] {
  if (node.type !== "promptTemplate") {
    return node.type && isWorkflowNodeType(node.type)
      ? WORKFLOW_HANDLES[node.type].inputs
      : [];
  }

  const data = node.data;

  if (
    typeof data !== "object" ||
    data === null ||
    !("template" in data) ||
    typeof data.template !== "string"
  ) {
    return [];
  }

  if ("inputs" in data && Array.isArray(data.inputs)) {
    return data.inputs.flatMap((input: unknown) => {
      if (
        typeof input === "object" &&
        input !== null &&
        "id" in input &&
        typeof input.id === "string"
      ) {
        return [input.id];
      }

      return [];
    });
  }

  // Legacy workflows use variable names as handle IDs.
  return extractPromptVariables(data.template);
}

function isPromptTemplateInput(
  value: unknown,
): value is PromptTemplateInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

/**
 * Whether an edge into this input handle takes part in execution.
 * Prompt Template ports whose variable was removed from the template
 * stay connected but inactive.
 */
export function isActiveInputHandle(
  node: ConnectionNode,
  handleId: string | null | undefined,
): boolean {
  if (node.type !== "promptTemplate") {
    return true;
  }

  const data = node.data;

  if (typeof data !== "object" || data === null) {
    return false;
  }

  const template =
    "template" in data && typeof data.template === "string"
      ? data.template
      : "";

  const inputs =
    "inputs" in data && Array.isArray(data.inputs)
      ? data.inputs.filter(isPromptTemplateInput)
      : undefined;

  return getActivePromptTemplateInputs(template, inputs).some(
    (input) => input.id === handleId,
  );
}

export function validateWorkflowConnection(
  connection: ConnectionEdge,
  nodes: readonly ConnectionNode[],
  edges: readonly ConnectionEdge[],
): ConnectionError | null {
  const { source, target, sourceHandle, targetHandle } = connection;

  if (!source || !target) {
    return "invalid";
  }

  if (source === target) {
    return "self";
  }

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  if (
    !sourceNode?.type ||
    !targetNode?.type ||
    !isWorkflowNodeType(sourceNode.type) ||
    !isWorkflowNodeType(targetNode.type)
  ) {
    return "invalid";
  }

  if (
    !sourceHandle ||
    !targetHandle ||
    !WORKFLOW_HANDLES[sourceNode.type].outputs.some(
      (handle) => handle === sourceHandle,
    ) ||
    !getInputHandles(targetNode).includes(targetHandle)
  ) {
    return "invalid";
  }

  if (
    edges.some(
      (edge) =>
        edge.target === target &&
        edge.targetHandle === targetHandle,
    )
  ) {
    return "occupied";
  }

  const visited = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const outgoing = adjacency.get(edge.source) ?? [];
    outgoing.push(edge.target);
    adjacency.set(edge.source, outgoing);
  }

  function hasPathToSource(nodeId: string): boolean {
    if (nodeId === source) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);

    return (adjacency.get(nodeId) ?? []).some(hasPathToSource);
  }

  return hasPathToSource(target) ? "cycle" : null;
}

export function validateImportedWorkflowGraph(
  nodes: readonly ConnectionNode[],
  edges: readonly ConnectionEdge[],
): WorkflowGraphValidationError | null {
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      return "duplicate";
    }

    nodeIds.add(node.id);

    if (!node.type || !isWorkflowNodeType(node.type)) {
      return "invalid";
    }
  }

  const validatedEdges: ConnectionEdge[] = [];
  const edgeIds = new Set<string>();

  for (const edge of edges) {
    if (edge.id === undefined || edgeIds.has(edge.id)) {
      return "duplicate";
    }

    edgeIds.add(edge.id);

    const error = validateWorkflowConnection(
      edge,
      nodes,
      validatedEdges,
    );

    if (error) {
      return error;
    }

    validatedEdges.push(edge);
  }

  return null;
}
