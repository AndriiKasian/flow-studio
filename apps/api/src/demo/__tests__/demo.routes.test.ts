import {
  workflowGraphSchema,
  type WorkflowExecutionEvent,
  type WorkflowGraph,
} from "@flow-studio/shared";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function parseJsonResponse(responseText: string): unknown {
  const parsed: unknown = JSON.parse(responseText);
  return parsed;
}

describe("Demo API routes", () => {
  beforeEach(() => {
    executeWorkflowMock.mockReset();
    dailyQuotaMock.mockReset();

    dailyQuotaMock.mockResolvedValue({ allowed: true, retryAfterSeconds: null });

    executeWorkflowMock.mockImplementation(
      (_graph, onEvent) => {
        onEvent?.({ type: "flow:start" });
        onEvent?.({
          type: "node:start",
          nodeId: "demo-text-input",
        });
        onEvent?.({
          type: "node:stop",
          nodeId: "demo-text-input",
          status: "completed",
        });
        onEvent?.({
          type: "flow:stop",
          status: "completed",
        });

        return Promise.resolve({
          status: "completed",
          results: {},
        });
      },
    );
  });

  it("GET /api/demo/workflow returns the fixed graph", async () => {
    const response = await request(app)
      .get("/api/demo/workflow")
      .expect(200);

    const body = parseJsonResponse(response.text);
    const graph = workflowGraphSchema.parse(body);

    expect(graph.nodes).toHaveLength(6);
    expect(graph.edges).toHaveLength(6);

    expect(graph.nodes.map((node) => node.type)).toEqual([
      "textInput",
      "webSearch",
      "promptTemplate",
      "llm",
      "textOutput",
      "jsonOutput",
    ]);
  });

  it("POST /api/demo/run streams SSE events", async () => {
    const response = await request(app)
      .post("/api/demo/run")
      .send({})
      .expect(200);

    expect(response.headers["content-type"]).toContain(
      "text/event-stream",
    );

    expect(response.text).toContain("event: flow:start");
    expect(response.text).toContain("event: node:start");
    expect(response.text).toContain("event: node:stop");
    expect(response.text).toContain("event: flow:stop");

    expect(executeWorkflowMock).toHaveBeenCalledOnce();
    expect(dailyQuotaMock).toHaveBeenCalledOnce();

    const executionCall = executeWorkflowMock.mock.calls[0];

    if (!executionCall) {
      throw new Error("Expected workflow execution");
    }

    const [graph] = executionCall;

    expect(graph.nodes).toHaveLength(6);
    expect(graph.edges).toHaveLength(6);
  });

  it("POST /api/demo/run rejects custom workflow data", async () => {
    const response = await request(app)
      .post("/api/demo/run")
      .send({
        nodes: [],
        edges: [],
      })
      .expect(400);

    expect(parseJsonResponse(response.text)).toEqual({
      error: "Demo execution does not accept input data",
    });

    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(dailyQuotaMock).not.toHaveBeenCalled();
  });

  it("POST /api/demo/run streams execution failures", async () => {
    executeWorkflowMock.mockImplementationOnce(
      (_graph, onEvent) => {
        onEvent?.({ type: "flow:start" });
        onEvent?.({
          type: "flow:stop",
          status: "failed",
          error: "Test execution failure",
        });

        return Promise.resolve({
          status: "failed",
          results: {},
          error: "Test execution failure",
        });
      },
    );

    const response = await request(app)
      .post("/api/demo/run")
      .send({})
      .expect(200);

    expect(response.text).toContain("event: flow:stop");
    expect(response.text).toContain('"status":"failed"');
    expect(response.text).toContain("Demo execution failed");
    expect(response.text).not.toContain("Test execution failure");
  });

  it("POST /api/demo/run returns 429 when daily quota is exhausted", async () => {
    dailyQuotaMock.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 });

    const response = await request(app)
      .post("/api/demo/run")
      .send({})
      .expect(429);

    expect(parseJsonResponse(response.text)).toEqual({
      error: { code: "DEMO_DAILY_LIMIT_REACHED", message: "Daily demo limit reached.", retryAfterSeconds: 3600 },
    });

    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it("POST /api/demo/run returns 503 when PostgreSQL fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const databaseError = new Error("Database unavailable");

    dailyQuotaMock.mockRejectedValueOnce(databaseError);

    const response = await request(app)
      .post("/api/demo/run")
      .send({})
      .expect(503);

    expect(parseJsonResponse(response.text)).toEqual({
      error: { code: "DEMO_TEMPORARILY_UNAVAILABLE", message: "Demo is temporarily unavailable. Please try again later.", retryAfterSeconds: null },
    });

    expect(executeWorkflowMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Demo daily quota check failed",
      databaseError,
    );

    errorSpy.mockRestore();
  });
});
