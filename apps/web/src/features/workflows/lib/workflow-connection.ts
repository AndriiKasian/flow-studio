
import {
  getOutgoers,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import {
  NODE_DEFINITIONS,
  type WorkflowNodeType,
} from "./node-definitions";

export type ConnectionError =
  | "self"
  | "invalid"
  | "occupied"
  | "cycle";

export const connectionErrorMessages: Record<ConnectionError, string> = {
  self: "A node cannot connect to itself.",
  invalid: "These handles cannot be connected.",
  occupied: "This input already has a connection.",
  cycle: "Circular connections are not allowed.",
};

const nodeHandles: Record<
  WorkflowNodeType,
  {
    inputs: string[];
    outputs: string[];
  }
> = {
  userInput: { inputs: [], outputs: ["value"] },
  textInput: { inputs: [], outputs: ["text"] },
  promptTemplate: { inputs: ["input"], outputs: ["prompt"] },
  llm: { inputs: ["prompt"], outputs: ["response"] },
  textTransform: { inputs: ["input"], outputs: ["output"] },
  textOutput: { inputs: ["input"], outputs: [] },
};

export function isWorkflowNodeType(
  value: string,
): value is WorkflowNodeType {
  return Object.prototype.hasOwnProperty.call(
    NODE_DEFINITIONS,
    value,
  );
}

export function validateWorkflowConnection(
  connection: Edge | Connection,
  nodes: Node[],
  edges: Edge[],
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
    !sourceNode ||
    !targetNode ||
    !sourceNode.type ||
    !targetNode.type ||
    !isWorkflowNodeType(sourceNode.type) ||
    !isWorkflowNodeType(targetNode.type)
  ) {
    return "invalid";
  }

  if (
    !sourceHandle ||
    !targetHandle ||
    !nodeHandles[sourceNode.type].outputs.includes(sourceHandle) ||
    !nodeHandles[targetNode.type].inputs.includes(targetHandle)
  ) {
    return "invalid";
  }

  const inputOccupied = edges.some(
    (edge) =>
      edge.target === target &&
      edge.targetHandle === targetHandle,
  );

  if (inputOccupied) {
    return "occupied";
  }

  const visited = new Set<string>();

  const hasPathToSource = (nodeId: string): boolean => {
    if (nodeId === source) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);

    const node = nodes.find((item) => item.id === nodeId);

    if (!node) {
      return false;
    }

    return getOutgoers(node, nodes, edges).some((outgoingNode) =>
      hasPathToSource(outgoingNode.id),
    );
  };

  return hasPathToSource(target) ? "cycle" : null;
}

export function validateImportedWorkflowGraph(
  nodes: Node[],
  edges: Edge[],
): ConnectionError | "duplicate" | null {
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

  const validatedEdges: Edge[] = [];
  const edgeIds = new Set<string>();

  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
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
