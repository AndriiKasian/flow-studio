import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../app.js";
import type { WorkflowExecutionResult } from "../../execution/execute-workflow.js";

type EventHandler = (
  event: WorkflowExecutionEvent,
) => void;

type ExecuteWorkflowFunction = (
  graph: WorkflowGraph,
  onEvent?: EventHandler,
) => Promise<WorkflowExecutionResult>;

const { executeWorkflowMock, dailyQuotaMock } = vi.hoisted(() => ({
  executeWorkflowMock: vi.fn<ExecuteWorkflowFunction>(),
  dailyQuotaMock: vi.fn<() => Promise<{ allowed: boolean; retryAfterSeconds: number | null }>>(),
}));

vi.mock("../../execution/execute-workflow.js", () => ({
  executeWorkflow: executeWorkflowMock,
}));

vi.mock("../demo-daily-quota.js", () => ({
  tryConsumeDemoDailyQuota: dailyQuotaMock,
}));

vi.mock("../demo-rate-limit.js", () => ({
  demoRateLimit: (
    _req: Request,
    _res: Response,
    next: NextFunction,
  ): void => {
    next();
  },
}));

function createDeferredResult() {
  let resolvePromise:
    | ((result: WorkflowExecutionResult) => void)
    | undefined;

  const promise = new Promise<WorkflowExecutionResult>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (): void => {
      if (!resolvePromise) {
        throw new Error("Deferred promise was not initialized");
      }

      resolvePromise({
        status: "completed",
        results: {},
      });
    },
  };
}

function parseJsonResponse(responseText: string): unknown {
  const parsed: unknown = JSON.parse(responseText);
  return parsed;
}

describe("Demo concurrency HTTP routes", () => {
  beforeEach(() => {
    executeWorkflowMock.mockReset();
    dailyQuotaMock.mockReset();

    dailyQuotaMock.mockResolvedValue({ allowed: true, retryAfterSeconds: null });

    executeWorkflowMock.mockImplementation(() =>
      Promise.resolve({
        status: "completed",
        results: {},
      }),
    );
  });

  afterEach(() => {
    executeWorkflowMock.mockReset();
  });

  it("rejects a third run while two runs are active", async () => {
    const firstExecution = createDeferredResult();
    const secondExecution = createDeferredResult();

    executeWorkflowMock
      .mockImplementationOnce(() => firstExecution.promise)
      .mockImplementationOnce(() => secondExecution.promise);

    const firstRequest = request(app)
      .post("/api/demo/run")
      .send({});

    const secondRequest = request(app)
      .post("/api/demo/run")
      .send({});

    const firstResponsePromise = firstRequest.then(
      (response) => response,
    );

    const secondResponsePromise = secondRequest.then(
      (response) => response,
    );

    try {
      await vi.waitFor(() => {
        expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
      });

      const thirdResponse = await request(app)
        .post("/api/demo/run")
        .send({})
        .expect(503);

      expect(parseJsonResponse(thirdResponse.text)).toEqual({
        error: { code: "DEMO_CONCURRENT_RUN_LIMIT", message: "Demo is currently busy. Please try again shortly.", retryAfterSeconds: null },
      });

      expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
      expect(dailyQuotaMock).toHaveBeenCalledTimes(2);
    } finally {
      firstExecution.resolve();
      secondExecution.resolve();

      await Promise.all([
        firstResponsePromise,
        secondResponsePromise,
      ]);
    }

    await request(app)
      .post("/api/demo/run")
      .send({})
      .expect(200);

    expect(executeWorkflowMock).toHaveBeenCalledTimes(3);
    expect(dailyQuotaMock).toHaveBeenCalledTimes(3);
  });
});
