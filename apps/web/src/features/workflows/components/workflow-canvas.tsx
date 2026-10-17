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

import { useEffect, type RefObject } from "react";
import {
  isActiveInputHandle,
  type WorkflowGraph,
} from "@flow-studio/shared";

import "@xyflow/react/dist/style.css";
import "../styles/workflow-canvas.css";

import {
  CANVAS_BACKGROUND,
  edgeTypes,
  nodeTypes,
} from "../lib/workflow-canvas-config";

import {
  getFitViewDecision,
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

interface WorkflowCanvasProps {
  initialGraph: WorkflowGraph | null;
  graphRef: RefObject<WorkflowCanvasGraph>;
  fitViewRequestRef: RefObject<FitViewRequest | null>;
  executionState: WorkflowExecutionState;
}

interface FitViewOnRequestProps {
  requestRef: RefObject<FitViewRequest | null>;
}

// Fits the viewport when a workflow is opened or imported, once React Flow
// has measured the requested nodes. Other node updates never fit.
function FitViewOnRequest({ requestRef }: FitViewOnRequestProps) {
  const nodesInitialized = useNodesInitialized();
  const { fitView, getNodes } = useReactFlow();

  useEffect(() => {
    const request = requestRef.current;

    if (!request) {
      return;
    }

    const decision = getFitViewDecision(
      request,
      getNodes().map((node) => node.id),
      nodesInitialized,
    );

    if (decision === "wait") {
      return;
    }

    requestRef.current = null;

    if (decision === "fit") {
      void fitView({
        padding: 0.2,
        duration: request.animate ? 300 : 0,
        maxZoom: 1,
      });
    }
  }, [nodesInitialized, fitView, getNodes, requestRef]);

  return null;
}

export function WorkflowCanvas({
  initialGraph,
  graphRef,
  fitViewRequestRef,
  executionState,
}: WorkflowCanvasProps) {
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

  const displayNodes = nodes.map((node) => {
    const status =
      executionState.nodeStatuses[node.id] ?? "idle";

    const outputs = executionState.nodeOutputs[node.id];

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
      },
    };
  });

  const nodesById = new Map(nodes.map((node) => [node.id, node]));

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
          : getWorkflowEdgeStatus(sourceStatus, targetStatus),
      },
    };
  });

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{
          type: "workflow",
        }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <FitViewOnRequest requestRef={fitViewRequestRef} />

        <Background
          variant={BackgroundVariant.Dots}
          gap={CANVAS_BACKGROUND.gap}
          size={CANVAS_BACKGROUND.dotSize}
        />

        <Controls />
      </ReactFlow>

      <ConnectionErrorAlert
        error={connectionError}
        onDismiss={dismissConnectionError}
      />
    </div>
  );
}
