
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

import { useWorkflowCanvas } from "../hooks/use-workflow-canvas";
import { ConnectionErrorAlert } from "./connection-error-alert";

interface WorkflowCanvasProps {
  initialGraph: WorkflowGraph | null;
}

export function WorkflowCanvas({ initialGraph } : WorkflowCanvasProps) {
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

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        proOptions={{ hideAttribution: true }}
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
