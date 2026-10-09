
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnConnectEnd,
  type Node,
} from "@xyflow/react";

import { NODE_DEFINITIONS } from "../lib/node-definitions";

import {
  NODE_DRAG_TYPE,
  categoryColors,
  initialEdges,
  initialNodes,
} from "../lib/workflow-canvas-config";

import {
  isWorkflowNodeType,
  validateWorkflowConnection,
  type ConnectionError,
} from "../lib/workflow-connection";

import type { WorkflowEdgeType } from "../components/edges/workflow-edge";

const ALERT_MESSAGE_TIMER = 10000;

export function useWorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node>(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<WorkflowEdgeType>(initialEdges);

  const [connectionError, setConnectionError] =
    useState<ConnectionError | null>(null);

  const [errorVersion, setErrorVersion] = useState(0);

  const lastInvalidConnection = useRef<ConnectionError | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (!connectionError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConnectionError(null);
    }, ALERT_MESSAGE_TIMER);

    return () => window.clearTimeout(timeoutId);
  }, [connectionError, errorVersion]);

  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(NODE_DRAG_TYPE);

      if (!isWorkflowNodeType(nodeType)) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: crypto.randomUUID(),
        type: nodeType,
        position,
        data: {},
        origin: [0.5, 0.5],
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
    },
    [screenToFlowPosition, setNodes],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const error = validateWorkflowConnection(
        connection,
        nodes,
        edges,
      );

      lastInvalidConnection.current = error;

      return error === null;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (validateWorkflowConnection(connection, nodes, edges)) {
        return;
      }

      const sourceNode = nodes.find(
        (node) => node.id === connection.source,
      );

      if (
        !sourceNode?.type ||
        !isWorkflowNodeType(sourceNode.type)
      ) {
        return;
      }

      const category = NODE_DEFINITIONS[sourceNode.type].category;

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "workflow",
            data: {
              color: categoryColors[category],
              status: "idle",
            },
          },
          currentEdges,
        ),
      );

      setConnectionError(null);
      lastInvalidConnection.current = null;
    },
    [nodes, edges, setEdges],
  );

  const onConnectStart = useCallback(() => {
    lastInvalidConnection.current = null;
    setConnectionError(null);
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (_event, connectionState) => {
      if (connectionState.isValid) {
        lastInvalidConnection.current = null;
        return;
      }

      const error = lastInvalidConnection.current;

      if (error) {
        setConnectionError(error);
        setErrorVersion((version) => version + 1);
      }

      lastInvalidConnection.current = null;
    },
    [],
  );

  const dismissConnectionError = useCallback(() => {
    setConnectionError(null);
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onDragOver,
    onDrop,
    onConnect,
    onConnectStart,
    onConnectEnd,
    isValidConnection,
    connectionError,
    dismissConnectionError,
  };
}
