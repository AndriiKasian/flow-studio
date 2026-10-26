"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDemoErrorMessage } from "../lib/demo-error";
import { notifyExecutionOutcome } from "../lib/execution-notification";
import { streamExecution } from "../lib/execution-stream";
import { useWorkflowAnimation } from "./use-workflow-animation";

interface UseDemoExecutionOptions {
  onStart: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useDemoExecution({
  onStart,
  onSuccess,
  onError,
}: UseDemoExecutionOptions) {
  const { executionState, reset, enqueue, flush, interrupt } =
    useWorkflowAnimation();

  const [isRunning, setIsRunning] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    reset();
    onStart();
    setIsRunning(true);

    try {
      const outcome = await streamExecution({
        url: "/api/demo/run",
        controller,
        onEvent: enqueue,
        getStartErrorMessage: getDemoErrorMessage,
      });

      // The run reported its result; let the visualization finish first.
      if (outcome.status === "completed" || outcome.status === "failed") {
        await flush();
      }

      notifyExecutionOutcome(outcome, { onSuccess, onError });

      // Without a reported result, stop nodes still shown as running.
      if (outcome.status === "rejected" || outcome.status === "interrupted") {
        await interrupt();
      }
    } finally {
      controller.abort();

      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setIsRunning(false);
      }
    }
  }, [reset, enqueue, flush, interrupt, onStart, onSuccess, onError]);

  // Leaving the demo page closes the stream so the server aborts the run.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const resetExecution = useCallback(() => {
    if (controllerRef.current) return;

    reset();
  }, [reset]);

  return {
    executionState,
    isRunning,
    run,
    resetExecution,
  };
}
