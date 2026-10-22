import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";
import type { NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { app } from "../../app.js";
import type { WorkflowExecutionResult } from "../../execution/execute-workflow.js";

type EventHandler = (event: WorkflowExecutionEvent) => void;

type ExecuteWorkflowFunction = (
  graph: WorkflowGraph,
  onEvent?: EventHandler,
  signal?: AbortSignal,
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

const completedResult: WorkflowExecutionResult = {
  status: "completed",
  results: {},
};

function createDeferred() {
  let resolvePromise: (() => void) | undefined;

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (): void => {
      if (!resolvePromise) {
        throw new Error("Deferred promise was not initialized");
      }

      resolvePromise();
    },
  };
}

describe("Demo SSE cancellation", () => {
  let server: Server | undefined;

  const getUrl = (): string => {
    if (!server) {
      throw new Error("Test server is not running");
    }

    const address = server.address() as AddressInfo;

    return `http://127.0.0.1:${address.port}/api/demo/run`;
  };

  const startRun = (
    url: string,
    signal?: AbortSignal,
  ): Promise<globalThis.Response> =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
      signal,
    });

  beforeEach(() => {
    executeWorkflowMock.mockReset();
    dailyQuotaMock.mockReset();
    dailyQuotaMock.mockResolvedValue({ allowed: true, retryAfterSeconds: null });
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (server) {
      const currentServer = server;
      server = undefined;

      currentServer.closeAllConnections();

      await new Promise<void>((resolve, reject) => {
        currentServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });

  it("aborts execution when the SSE client disconnects", async () => {
    let receivedSignal: AbortSignal | undefined;

    executeWorkflowMock.mockImplementation(
      (_graph, onEvent, signal) => {
        receivedSignal = signal;
        onEvent?.({ type: "flow:start" });

        return new Promise<WorkflowExecutionResult>((resolve) => {
          if (signal?.aborted) {
            resolve(completedResult);
            return;
          }

          signal?.addEventListener(
            "abort",
            () => resolve(completedResult),
            { once: true },
          );
        });
      },
    );

    server = app.listen(0);
    const url = getUrl();

    const controller = new AbortController();

    const response = await startRun(url, controller.signal);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "text/event-stream",
    );

    await vi.waitFor(() => {
      expect(executeWorkflowMock).toHaveBeenCalledOnce();
    });

    expect(receivedSignal?.aborted).toBe(false);

    controller.abort();

    await vi.waitFor(() => {
      expect(receivedSignal?.aborted).toBe(true);
    });
  });

  it("releases the concurrency slot after client cancellation", async () => {
    const firstExecutionFinished = createDeferred();

    let executionCount = 0;

    executeWorkflowMock.mockImplementation(
      (_graph, onEvent, signal) => {
        executionCount += 1;
        onEvent?.({ type: "flow:start" });

        if (executionCount > 2) {
          return Promise.resolve(completedResult);
        }

        const isFirstExecution = executionCount === 1;

        return new Promise<WorkflowExecutionResult>((resolve) => {
          const finish = (): void => {
            resolve(completedResult);

            if (isFirstExecution) {
              firstExecutionFinished.resolve();
            }
          };

          if (signal?.aborted) {
            finish();
            return;
          }

          signal?.addEventListener("abort", finish, {
            once: true,
          });
        });
      },
    );

    server = app.listen(0);
    const url = getUrl();

    const firstController = new AbortController();
    const secondController = new AbortController();

    const [firstResponse, secondResponse] = await Promise.all([
      startRun(url, firstController.signal),
      startRun(url, secondController.signal),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    await vi.waitFor(() => {
      expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
    });

    const busyResponse = await startRun(url);

    expect(busyResponse.status).toBe(503);

    await busyResponse.body?.cancel();

    firstController.abort();

    await firstExecutionFinished.promise;

    // Allow the controller's finally block to release the slot.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    const nextResponse = await startRun(url);

    expect(nextResponse.status).toBe(200);

    await nextResponse.body?.cancel();

    secondController.abort();

    expect(executeWorkflowMock).toHaveBeenCalledTimes(3);
  });

  it("aborts execution after the workflow timeout", async () => {
    let receivedSignal: AbortSignal | undefined;
    let triggerTimeout: (() => void) | undefined;

    const executionStarted = createDeferred();

    const originalSetTimeout = globalThis.setTimeout;

    const timeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((handler, delay) => {
        if (delay === 45_000) {
          if (typeof handler !== "function") {
            throw new Error("Expected a timeout callback");
          }

          triggerTimeout = () => {
            handler();
          };

          // Keep a real timer handle for clearTimeout().
          return originalSetTimeout(
            () => undefined,
            45_000,
          );
        }

        return originalSetTimeout(handler, delay);
      });

    executeWorkflowMock.mockImplementation(
      (_graph, onEvent, signal) => {
        receivedSignal = signal;
        onEvent?.({ type: "flow:start" });

        executionStarted.resolve();

        return new Promise<WorkflowExecutionResult>((resolve) => {
          if (signal?.aborted) {
            resolve(completedResult);
            return;
          }

          signal?.addEventListener(
            "abort",
            () => resolve(completedResult),
            { once: true },
          );
        });
      },
    );

    try {
      server = app.listen(0);
      const url = getUrl();

      const response = await startRun(url);

      expect(response.status).toBe(200);

      await executionStarted.promise;

      expect(receivedSignal?.aborted).toBe(false);
      expect(triggerTimeout).toBeDefined();

      if (!triggerTimeout) {
        throw new Error("Workflow timeout was not registered");
      }

      triggerTimeout();

      await vi.waitFor(() => {
        expect(receivedSignal?.aborted).toBe(true);
      });

      await response.body?.cancel();
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
