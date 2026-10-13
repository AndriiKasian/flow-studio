"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

import {
  applyWorkflowExecutionEvent,
  initialWorkflowExecutionState,
  type WorkflowExecutionState,
} from "../lib/workflow-execution-status";

const MIN_RUNNING_DURATION = 800;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      resolve();
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function useWorkflowAnimation() {
  const [executionState, setExecutionState] =
    useState<WorkflowExecutionState>(initialWorkflowExecutionState);

  const controllerRef = useRef<AbortController | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const nodeStartTimesRef = useRef(new Map<string, number>());

  const reset = useCallback(() => {
    controllerRef.current?.abort();

    controllerRef.current = new AbortController();
    queueRef.current = Promise.resolve();
    nodeStartTimesRef.current.clear();

    setExecutionState(initialWorkflowExecutionState);
  }, []);

  const enqueue = useCallback((event: WorkflowExecutionEvent) => {
    const controller = controllerRef.current;

    if (!controller || controller.signal.aborted) return;

    queueRef.current = queueRef.current.then(async () => {
      if (controller.signal.aborted) return;

      if (event.type === "node:start") {
        nodeStartTimesRef.current.set(
          event.nodeId,
          performance.now(),
        );
      }

      if (event.type === "node:stop") {
        const startedAt = nodeStartTimesRef.current.get(event.nodeId);

        if (startedAt !== undefined) {
          const elapsed = performance.now() - startedAt;
          const remaining = MIN_RUNNING_DURATION - elapsed;

          if (remaining > 0) {
            await wait(remaining, controller.signal);
          }
        }

        nodeStartTimesRef.current.delete(event.nodeId);
      }

      if (controller.signal.aborted) return;

      setExecutionState((current) =>
        applyWorkflowExecutionEvent(current, event),
      );
    });
  }, []);

  const flush = useCallback(async () => {
    await queueRef.current;
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    executionState,
    reset,
    enqueue,
    flush,
  };
}
