"use client";

import { useCallback, useRef } from "react";
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

import { prepareWorkflowGraph } from "../lib/prepare-workflow-graph";
import type { WorkflowCanvasGraph } from "./use-workflow-canvas";
import { useWorkflowAnimation } from "./use-workflow-animation";
import { useWorkflowExecution } from "./use-workflow-execution";

type FlowStopEvent = Extract<
  WorkflowExecutionEvent,
  { type: "flow:stop" }
>;

interface UseWorkflowEditorExecutionOptions {
  flowId: string;
  getCanvasGraph: () => WorkflowCanvasGraph;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
}

export function useWorkflowEditorExecution({
  flowId,
  getCanvasGraph,
  onSuccess,
  onError,
  onStart,
}: UseWorkflowEditorExecutionOptions) {
  const { executionState, reset, enqueue, flush, interrupt } =
    useWorkflowAnimation();

  const flowStopEventRef = useRef<FlowStopEvent | null>(null);

  const { run, isRunning } = useWorkflowExecution({
    flowId,
    onEvent: (event) => {
      enqueue(event);

      if (event.type === "flow:stop") {
        flowStopEventRef.current = event;
      }
    },
    onComplete: flush,
  });

  const handleRun = useCallback(async () => {
    if (isRunning) return;

    onStart();

    // Canvas state, not getNodes(): React Flow's store holds the display
    // projections with runtime results and statuses.
    const { nodes, edges } = getCanvasGraph();
    const graph = prepareWorkflowGraph(nodes, edges);

    if (!graph) {
      onError("Invalid workflow graph");
      return;
    }

    flowStopEventRef.current = null;
    reset();

    try {
      await run(graph);

      const getFlowStopEvent = () => flowStopEventRef.current;
      const event = getFlowStopEvent();

      if (!event) return;

      if (event.status === "completed") {
        onSuccess("Workflow executed successfully");
      } else {
        onError(event.error ?? "Workflow execution failed");
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Failed to execute workflow",
      );

      await interrupt();
    }
  }, [
    isRunning,
    onStart,
    onSuccess,
    onError,
    getCanvasGraph,
    reset,
    interrupt,
    run,
  ]);

  return {
    executionState,
    isRunning,
    handleRun,
    resetExecution: reset,
  };
}
