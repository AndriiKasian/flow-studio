
export type WorkflowExecutionEvent =
  | {
      type: "flow:start";
    }
  | {
      type: "node:start";
      nodeId: string;
    }
  | {
      type: "node:stop";
      nodeId: string;
      status: "completed" | "failed" | "skipped";
      error?: string;
      outputs?: Record<string, unknown>;
    }
  | {
      type: "flow:stop";
      status: "completed" | "failed";
      error?: string;
    };
