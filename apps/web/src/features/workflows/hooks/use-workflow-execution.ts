"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";

class ExecutionStreamError extends Error {}

interface UseWorkflowExecutionOptions {
  flowId: string;
  onEvent?: (event: WorkflowExecutionEvent) => void;
  onComplete?: () => Promise<void>;
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

  const run = useCallback(
    async (graph: WorkflowGraph) => {
      if (controllerRef.current) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsRunning(true);

      let completed = false;

      try {
        await fetchEventSource(
          `/api/flows/${encodeURIComponent(flowId)}/execute/stream`,
          {
            method: "POST",
            headers: {
              Accept: "text/event-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(graph),
            signal: controller.signal,
            openWhenHidden: true,

            async onopen(response) {
              if (!response.ok) {
                let errorMessage =
                  `Failed to start workflow: HTTP ${response.status}`;

                try {
                  const body: unknown = await response.json();

                  if (
                    typeof body === "object" &&
                    body !== null &&
                    "error" in body &&
                    typeof body.error === "string"
                  ) {
                    errorMessage = body.error;
                  }
                } catch {
                  // Keep the HTTP error if the response is not JSON.
                }

                throw new ExecutionStreamError(errorMessage);
              }

              if (
                !response.headers
                  .get("content-type")
                  ?.includes("text/event-stream")
              ) {
                throw new ExecutionStreamError(
                  "Invalid execution stream response",
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
                throw new ExecutionStreamError(
                  "Invalid execution event",
                );
              }

              onEventRef.current?.(event);

              if (event.type === "flow:stop") {
                completed = true;
                controller.abort();
              }
            },

            onclose() {
              if (!completed) {
                throw new ExecutionStreamError(
                  "Execution stream closed unexpectedly",
                );
              }
            },

            onerror(error) {
              throw error;
            },
          },
        );

        if (!completed) {
          throw new ExecutionStreamError(
            "Execution finished without flow:stop",
          );
        }

        await onCompleteRef.current?.();
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
