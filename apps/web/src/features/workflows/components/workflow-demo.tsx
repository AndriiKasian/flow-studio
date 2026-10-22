"use client";

import { useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { WorkflowGraph } from "@flow-studio/shared";

import { useDemoExecution } from "../hooks/use-demo-execution";
import type { WorkflowCanvasGraph } from "../hooks/use-workflow-canvas";
import {
  createFitViewRequest,
  type FitViewRequest,
} from "../lib/fit-view-request";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorHeader } from "./workflow-editor-header";

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

  const {
    executionState,
    isRunning,
    error,
    run,
    resetExecution,
  } = useDemoExecution();

  const hasExecution =
    Object.keys(executionState.nodeStatuses).length > 0 ||
    Object.keys(executionState.nodeOutputs).length > 0 ||
    error !== null;

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader
        variant="demo"
        onRun={() => void run()}
        onClearExecution={resetExecution}
        isRunning={isRunning}
        hasExecution={hasExecution}
      />

      {error && (
        <div
          role="alert"
          className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <WorkflowCanvas
          initialGraph={graph}
          graphRef={canvasGraphRef}
          fitViewRequestRef={fitViewRequestRef}
          executionState={executionState}
          readOnly
        />
      </main>
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
