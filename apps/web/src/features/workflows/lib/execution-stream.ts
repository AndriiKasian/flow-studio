import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

type FlowStopEvent = Extract<
  WorkflowExecutionEvent,
  { type: "flow:stop" }
>;

/**
 * The terminal result of one execution request:
 * - completed / failed: the run reported its result with flow:stop;
 * - rejected: the request was refused before the run started;
 * - interrupted: the stream ended or broke without a result, so the run's
 *   outcome is unknown.
 */
export type ExecutionOutcome =
  | { status: "completed" }
  | { status: "failed"; error: string }
  | { status: "rejected"; error: string }
  | { status: "interrupted" };

class ExecutionStartError extends Error {}

interface StreamExecutionOptions {
  url: string;
  body?: string;
  controller: AbortController;
  onEvent: (event: WorkflowExecutionEvent) => void;
  // A user-facing message for a request refused with an HTTP error.
  getStartErrorMessage: (body: unknown, status: number) => string;
}

/**
 * Streams one execution, passing each event to `onEvent` until the first
 * flow:stop, and resolves with exactly one outcome. Never rejects.
 */
export async function streamExecution({
  url,
  body,
  controller,
  onEvent,
  getStartErrorMessage,
}: StreamExecutionOptions): Promise<ExecutionOutcome> {
  let flowStopEvent: FlowStopEvent | null = null;

  try {
    await fetchEventSource(url, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body,
      signal: controller.signal,
      openWhenHidden: true,

      async onopen(response) {
        if (!response.ok) {
          let errorBody: unknown = null;

          try {
            errorBody = await response.json();
          } catch {
            // Keep the HTTP error when the response is not JSON.
          }

          throw new ExecutionStartError(
            getStartErrorMessage(errorBody, response.status),
          );
        }

        if (
          !response.headers
            .get("content-type")
            ?.includes("text/event-stream")
        ) {
          throw new Error("Invalid execution stream response");
        }
      },

      onmessage(message: EventSourceMessage) {
        // flow:stop is terminal; ignore anything still buffered after it.
        if (flowStopEvent) return;

        let event: WorkflowExecutionEvent;

        try {
          event = JSON.parse(message.data) as WorkflowExecutionEvent;
        } catch {
          throw new Error("Invalid execution event");
        }

        onEvent(event);

        if (event.type === "flow:stop") {
          flowStopEvent = event;
          controller.abort();
        }
      },

      onclose() {
        if (!flowStopEvent) {
          throw new Error("Execution stream closed unexpectedly");
        }
      },

      onerror(error) {
        throw error;
      },
    });
  } catch (error) {
    if (error instanceof ExecutionStartError) {
      return { status: "rejected", error: error.message };
    }

    // Kept for diagnosis; users see a generic interruption message.
    console.error("Workflow execution stream interrupted:", error);
  }

  // Assigned in onmessage, which TypeScript cannot see.
  const stopEvent = flowStopEvent as FlowStopEvent | null;

  if (!stopEvent) {
    return { status: "interrupted" };
  }

  return stopEvent.status === "completed"
    ? { status: "completed" }
    : {
        status: "failed",
        error: stopEvent.error ?? "Workflow execution failed",
      };
}
