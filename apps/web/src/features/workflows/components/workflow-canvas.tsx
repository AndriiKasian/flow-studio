
"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import type { WorkflowGraph } from "@flow-studio/shared";
import "@xyflow/react/dist/style.css";
import "../styles/workflow-canvas.css";

import {
  CANVAS_BACKGROUND,
  edgeTypes,
  nodeTypes,
} from "../lib/workflow-canvas-config";
import { getWorkflowEdgeStatus } from "../lib/workflow-edge-status";
import { getWorkflowNodeClassName } from "../lib/workflow-node-class";
import type { WorkflowExecutionState } from "../lib/workflow-execution-status";
import { useWorkflowCanvas } from "../hooks/use-workflow-canvas";
import { ConnectionErrorAlert } from "./connection-error-alert";

interface WorkflowCanvasProps {
  initialGraph: WorkflowGraph | null;
  executionState: WorkflowExecutionState;
}

export function WorkflowCanvas({
  initialGraph,
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
  } = useWorkflowCanvas(initialGraph);

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

  const displayEdges = edges.map((edge) => {
    const sourceStatus =
      executionState.nodeStatuses[edge.source] ?? "idle";

    const targetStatus =
      executionState.nodeStatuses[edge.target] ?? "idle";

    return {
      ...edge,
      data: {
        ...edge.data,
        status: getWorkflowEdgeStatus(
          sourceStatus,
          targetStatus,
        ),
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
        fitView
      >
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
