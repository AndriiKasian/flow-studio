"use client";

import { useCallback } from "react";

import { notifyExecutionOutcome } from "../lib/execution-notification";
import { prepareWorkflowGraph } from "../lib/prepare-workflow-graph";
import type { WorkflowCanvasGraph } from "./use-workflow-canvas";
import { useWorkflowAnimation } from "./use-workflow-animation";
import { useWorkflowExecution } from "./use-workflow-execution";

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

  const { run, isRunning } = useWorkflowExecution({
    flowId,
    onEvent: enqueue,
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

    reset();

    const outcome = await run(graph);

    if (!outcome) return;

    notifyExecutionOutcome(outcome, { onSuccess, onError });

    // Without a reported result, stop nodes still shown as running.
    if (outcome.status === "rejected" || outcome.status === "interrupted") {
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
