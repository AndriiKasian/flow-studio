
"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";

import {
  useEffect,
  useState,
  type RefObject,
} from "react";

import {
  isActiveInputHandle,
  type WorkflowGraph,
} from "@flow-studio/shared";

import { WorkflowReadOnlyContext } from "../contexts/workflow-read-only-context";

import {
  CANVAS_BACKGROUND,
  edgeTypes,
  nodeTypes,
} from "../lib/workflow-canvas-config";

import {
  processFitViewRequest,
  type FitViewRequest,
} from "../lib/fit-view-request";

import { getWorkflowEdgeStatus } from "../lib/workflow-edge-status";
import { getWorkflowNodeClassName } from "../lib/workflow-node-class";
import type { WorkflowExecutionState } from "../lib/workflow-execution-status";

import {
  useWorkflowCanvas,
  type WorkflowCanvasGraph,
} from "../hooks/use-workflow-canvas";

import { ConnectionErrorAlert } from "./connection-error-alert";

import "@xyflow/react/dist/style.css";
import "../styles/workflow-canvas.css";

interface WorkflowCanvasProps {
  initialGraph: WorkflowGraph | null;
  graphRef: RefObject<WorkflowCanvasGraph>;
  fitViewRequestRef: RefObject<FitViewRequest | null>;
  executionState: WorkflowExecutionState;
  readOnly?: boolean;
}

interface FitViewOnRequestProps {
  requestRef: RefObject<FitViewRequest | null>;
  onInitialFitComplete?: () => void;
}

function FitViewOnRequest({
  requestRef,
  onInitialFitComplete,
}: FitViewOnRequestProps) {
  const nodesInitialized = useNodesInitialized();
  const { fitView, getNodes } = useReactFlow();

  useEffect(() => {
    processFitViewRequest(
      requestRef,
      getNodes().map((node) => node.id),
      nodesInitialized,
      (request) =>
        fitView({
          padding: 0.2,
          duration: request.animate ? 300 : 0,
          maxZoom: 1,
        }),
      onInitialFitComplete,
    );
  }, [
    nodesInitialized,
    fitView,
    getNodes,
    requestRef,
    onInitialFitComplete,
  ]);

  return null;
}

export function WorkflowCanvas({
  initialGraph,
  graphRef,
  fitViewRequestRef,
  executionState,
  readOnly = false,
}: WorkflowCanvasProps) {
  const [initialFitComplete, setInitialFitComplete] = useState(!readOnly);

  const {
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
  } = useWorkflowCanvas(initialGraph, graphRef);

  // Read the executed Text Input value for the connected Web Search node.
  // This is display-only: it does not modify the saved workflow graph.
  const getWebSearchQuery = (webSearchNodeId: string) => {
    const incomingEdge = edges.find(
      (edge) =>
        edge.target === webSearchNodeId &&
        edge.targetHandle === "query" &&
        edge.sourceHandle === "text",
    );

    if (!incomingEdge) {
      return undefined;
    }

    const sourceNode = nodes.find(
      (node) =>
        node.id === incomingEdge.source &&
        node.type === "textInput",
    );

    if (!sourceNode) {
      return undefined;
    }

    const executedValue =
      executionState.nodeOutputs[sourceNode.id]?.text;

    if (typeof executedValue === "string") {
      return executedValue;
    }

    // Before execution, display the configured Text Input value.
    return typeof sourceNode.data.text === "string"
      ? sourceNode.data.text
      : undefined;
  };


  const displayNodes = nodes.map((node) => {
    const status =
      executionState.nodeStatuses[node.id] ?? "idle";

    const outputs = executionState.nodeOutputs[node.id];

    const webSearchQuery =
      readOnly && node.type === "webSearch"
        ? getWebSearchQuery(node.id)
        : undefined;

    return {
      ...node,
      className: getWorkflowNodeClassName(
        node.className,
        status,
      ),
      data: {
        ...node.data,
        ...(node.type === "textOutput" &&
        typeof outputs?.result === "string"
          ? { result: outputs.result }
          : {}),
        ...(node.type === "jsonOutput" &&
        outputs?.result !== undefined
          ? { result: outputs.result }
          : {}),
        ...(webSearchQuery !== undefined
          ? { query: webSearchQuery }
          : {}),
      },
    };
  });

  const nodesById = new Map(
    nodes.map((node) => [node.id, node]),
  );

  const displayEdges = edges.map((edge) => {
    const target = nodesById.get(edge.target);

    const inactive =
      target !== undefined &&
      !isActiveInputHandle(target, edge.targetHandle);

    const sourceStatus =
      executionState.nodeStatuses[edge.source] ?? "idle";

    const targetStatus =
      executionState.nodeStatuses[edge.target] ?? "idle";

    return {
      ...edge,
      data: {
        ...edge.data,
        inactive,
        status: inactive
          ? "idle"
          : getWorkflowEdgeStatus(
              sourceStatus,
              targetStatus,
            ),
      },
    };
  });

  return (
    <WorkflowReadOnlyContext.Provider value={readOnly}>
      <div
        className="relative h-full w-full"
        style={{
          opacity:
            readOnly && !initialFitComplete ? 0 : 1,
        }}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={
            readOnly ? undefined : onEdgesChange
          }
          onDragOver={readOnly ? undefined : onDragOver}
          onDrop={readOnly ? undefined : onDrop}
          onConnect={readOnly ? undefined : onConnect}
          onConnectStart={
            readOnly ? undefined : onConnectStart
          }
          onConnectEnd={
            readOnly ? undefined : onConnectEnd
          }
          isValidConnection={
            readOnly ? undefined : isValidConnection
          }
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          nodesFocusable={!readOnly}
          edgesFocusable={!readOnly}
          panOnScroll={false}
          zoomOnScroll={!readOnly}
          connectionLineType={ConnectionLineType.Bezier}
          defaultEdgeOptions={{
            type: "workflow",
          }}
          deleteKeyCode={
            readOnly ? null : ["Backspace", "Delete"]
          }
          proOptions={{ hideAttribution: true }}
        >
          <FitViewOnRequest
            requestRef={fitViewRequestRef}
            onInitialFitComplete={
              readOnly
                ? () => setInitialFitComplete(true)
                : undefined
            }
          />

          <Background
            variant={BackgroundVariant.Dots}
            gap={CANVAS_BACKGROUND.gap}
            size={CANVAS_BACKGROUND.dotSize}
          />

          <Controls />
        </ReactFlow>

        {!readOnly && (
          <ConnectionErrorAlert
            error={connectionError}
            onDismiss={dismissConnectionError}
          />
        )}
      </div>
    </WorkflowReadOnlyContext.Provider>
  );
}
