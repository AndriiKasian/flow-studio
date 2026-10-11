import { WORKFLOW_HANDLES } from "./workflow-handles";
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
    !WORKFLOW_HANDLES[targetNode.type].inputs.some(
      (handle) => handle === targetHandle,
    )
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