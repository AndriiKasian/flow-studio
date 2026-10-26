"use client";

import { useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { WorkflowGraph } from "@flow-studio/shared";

import { useDemoExecution } from "../hooks/use-demo-execution";
import type { WorkflowCanvasGraph } from "../hooks/use-workflow-canvas";
import { useWorkflowToast } from "../hooks/use-workflow-toast";
import {
  createFitViewRequest,
  type FitViewRequest,
} from "../lib/fit-view-request";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorHeader } from "./workflow-editor-header";
import { WorkflowToast } from "./workflow-toast";

interface WorkflowDemoProps {
  graph: WorkflowGraph;
}

function WorkflowDemoContent({ graph }: WorkflowDemoProps) {
  const canvasGraphRef = useRef<WorkflowCanvasGraph>({
    nodes: [],
    edges: [],
  });

  const [initialFitViewRequest] = useState(() =>
    createFitViewRequest(graph.nodes, false),
  );

  const fitViewRequestRef = useRef<FitViewRequest | null>(
    initialFitViewRequest,
  );

  // Same execution notifications as the editor.
  const {
    message,
    variant,
    clearMessage,
    showSuccess,
    showError,
  } = useWorkflowToast();

  const {
    executionState,
    isRunning,
    run,
    resetExecution,
  } = useDemoExecution({
    onStart: clearMessage,
    onSuccess: showSuccess,
    onError: showError,
  });

  const handleClearExecution = () => {
    if (isRunning) return;

    resetExecution();
    clearMessage();
  };

  const hasExecution =
    Object.keys(executionState.nodeStatuses).length > 0 ||
    Object.keys(executionState.nodeOutputs).length > 0;

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader
        variant="demo"
        onRun={() => void run()}
        onClearExecution={handleClearExecution}
        isRunning={isRunning}
        hasExecution={hasExecution}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <WorkflowCanvas
          initialGraph={graph}
          graphRef={canvasGraphRef}
          fitViewRequestRef={fitViewRequestRef}
          executionState={executionState}
          readOnly
        />
      </main>

      <WorkflowToast
        message={message}
        variant={variant}
        onDismiss={clearMessage}
      />
    </div>
  );
}

export function WorkflowDemo({ graph }: WorkflowDemoProps) {
  return (
    <ReactFlowProvider>
      <WorkflowDemoContent graph={graph} />
    </ReactFlowProvider>
  );
}
