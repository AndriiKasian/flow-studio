"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";

import {
  streamExecution,
  type ExecutionOutcome,
} from "../lib/execution-stream";

interface UseWorkflowExecutionOptions {
  flowId: string;
  onEvent?: (event: WorkflowExecutionEvent) => void;
  onComplete?: () => Promise<void>;
}

function getStartErrorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return `Failed to start workflow: HTTP ${status}`;
}

export function useWorkflowExecution({
  flowId,
  onEvent,
  onComplete,
}: UseWorkflowExecutionOptions) {
  const [isRunning, setIsRunning] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const onEventRef = useRef(onEvent);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onEventRef.current = onEvent;
    onCompleteRef.current = onComplete;
  }, [onEvent, onComplete]);

  // Resolves with the run's outcome, or null when a run is already active.
  const run = useCallback(
    async (graph: WorkflowGraph): Promise<ExecutionOutcome | null> => {
      if (controllerRef.current) return null;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsRunning(true);

      try {
        const outcome = await streamExecution({
          url: `/api/flows/${encodeURIComponent(flowId)}/execute/stream`,
          body: JSON.stringify(graph),
          controller,
          onEvent: (event) => onEventRef.current?.(event),
          getStartErrorMessage,
        });

        // The run reported its result; let the visualization finish first.
        if (outcome.status === "completed" || outcome.status === "failed") {
          await onCompleteRef.current?.();
        }

        return outcome;
      } finally {
        controller.abort();

        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setIsRunning(false);
        }
      }
    },
    [flowId],
  );

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { run, isRunning };
}
