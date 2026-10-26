import { describe, expect, it, vi } from "vitest";

import {
  notifyExecutionOutcome,
  WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE,
  WORKFLOW_EXECUTION_SUCCESS_MESSAGE,
} from "../execution-notification";
import type { ExecutionOutcome } from "../execution-stream";

function notify(outcome: ExecutionOutcome) {
  const onSuccess = vi.fn();
  const onError = vi.fn();

  notifyExecutionOutcome(outcome, { onSuccess, onError });

  return { onSuccess, onError };
}

describe("notifyExecutionOutcome", () => {
  it("shows the existing success message once for a completed run", () => {
    const { onSuccess, onError } = notify({ status: "completed" });

    expect(WORKFLOW_EXECUTION_SUCCESS_MESSAGE).toBe(
      "Workflow executed successfully",
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(WORKFLOW_EXECUTION_SUCCESS_MESSAGE);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each<ExecutionOutcome>([
    { status: "failed", error: "Web Search failed" },
    { status: "rejected", error: "Daily demo limit reached." },
  ])("shows the reported error once for a $status run", (outcome) => {
    const { onSuccess, onError } = notify(outcome);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      "error" in outcome ? outcome.error : undefined,
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("reports an interrupted run as an unknown result, not a failure", () => {
    const { onSuccess, onError } = notify({ status: "interrupted" });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE,
    );
    expect(WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE).toContain("unknown");
    expect(WORKFLOW_EXECUTION_INTERRUPTED_MESSAGE).not.toMatch(/fail/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
