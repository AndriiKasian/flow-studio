
"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "../styles/workflow-canvas.css";

import {
  CANVAS_BACKGROUND,
  edgeTypes,
  nodeTypes,
} from "../lib/workflow-canvas-config";

import { useWorkflowCanvas } from "../hooks/use-workflow-canvas";
import { ConnectionErrorAlert } from "./connection-error-alert";

function WorkflowCanvasContent() {
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
  } = useWorkflowCanvas();

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

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent />
    </ReactFlowProvider>
  );
}
