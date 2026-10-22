"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

import { getDemoErrorMessage } from "../lib/demo-error";
import { useWorkflowAnimation } from "./use-workflow-animation";

type FlowStopEvent = Extract<
  WorkflowExecutionEvent,
  { type: "flow:stop" }
>;

class DemoExecutionError extends Error {}

export function useDemoExecution() {
  const { executionState, reset, enqueue, flush, interrupt } =
    useWorkflowAnimation();

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    reset();
    setError(null);
    setIsRunning(true);

    let completed = false;
    let flowStopEvent: FlowStopEvent | null = null;

    try {
      await fetchEventSource("/api/demo/run", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        signal: controller.signal,
        openWhenHidden: true,

        async onopen(response) {
          if (!response.ok) {
            let body: unknown = null;

            try {
              body = await response.json();
            } catch {
              // Keep the HTTP error when the response is not JSON.
            }

            throw new DemoExecutionError(
              getDemoErrorMessage(body, response.status),
            );
          }

          if (
            !response.headers
              .get("content-type")
              ?.includes("text/event-stream")
          ) {
            throw new DemoExecutionError(
              "Invalid demo execution stream",
            );
          }
        },

        onmessage(message: EventSourceMessage) {
          let event: WorkflowExecutionEvent;

          try {
            event = JSON.parse(
              message.data,
            ) as WorkflowExecutionEvent;
          } catch {
            throw new DemoExecutionError(
              "Invalid demo execution event",
            );
          }

          enqueue(event);

          if (event.type === "flow:stop") {
            flowStopEvent = event;
            completed = true;
            controller.abort();
          }
        },

        onclose() {
          if (!completed) {
            throw new DemoExecutionError(
              "Demo execution stream closed unexpectedly",
            );
          }
        },

        onerror(streamError) {
          throw streamError;
        },
      });

      if (!completed) {
        throw new DemoExecutionError(
          "Demo execution finished without flow:stop",
        );
      }

      await flush();

      const stopEvent = flowStopEvent as FlowStopEvent | null;

      if (stopEvent?.status !== "completed") {
        setError(
          stopEvent?.error ?? "Demo execution failed",
        );
      }
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Failed to execute demo",
      );

      await interrupt();
    } finally {
      controller.abort();

      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setIsRunning(false);
      }
    }
  }, [reset, enqueue, flush, interrupt]);

  // Leaving the demo page closes the stream so the server aborts the run.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const resetExecution = useCallback(() => {
    if (controllerRef.current) return;

    reset();
    setError(null);
  }, [reset]);

  return {
    executionState,
    isRunning,
    error,
    run,
    resetExecution,
  };
}