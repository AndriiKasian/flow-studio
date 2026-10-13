"use client";

import { useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  workflowGraphSchema,
  type WorkflowExecutionEvent,
} from "@flow-studio/shared";

import { useWorkflowAnimation } from "./use-workflow-animation";
import { useWorkflowExecution } from "./use-workflow-execution";

type FlowStopEvent = Extract<
  WorkflowExecutionEvent,
  { type: "flow:stop" }
>;

interface UseWorkflowEditorExecutionOptions {
  flowId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
}

export function useWorkflowEditorExecution({
  flowId,
  onSuccess,
  onError,
  onStart,
}: UseWorkflowEditorExecutionOptions) {
  const { getNodes, getEdges } = useReactFlow();

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

    const graph = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!graph.success) {
      onError("Invalid workflow graph");
      return;
    }

    flowStopEventRef.current = null;
    reset();

    try {
      await run(graph.data);

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
    getNodes,
    getEdges,
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
