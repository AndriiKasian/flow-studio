import type {
  DemoErrorResponse,
  WorkflowExecutionEvent,
} from "@flow-studio/shared";
import type { Request, Response } from "express";

import { executeWorkflow } from "../execution/execute-workflow.js";
import { logError } from "../lib/error-diagnostics.js";
import { SSE_RESPONSE_HEADERS } from "../lib/sse.js";
import {
  releaseDemoRun,
  tryAcquireDemoRun,
} from "./demo-concurrency.js";
import { tryConsumeDemoDailyQuota } from "./demo-daily-quota.js";
import { createDemoWorkflow } from "./demo-workflow.js";

const WORKFLOW_TIMEOUT_MS = 45_000;

export function getDemoWorkflowController(
  _req: Request,
  res: Response,
): void {
  res.status(200).json(createDemoWorkflow());
}

export async function runDemoWorkflowController(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (
    body !== undefined &&
    body !== null &&
    (typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length > 0)
  ) {
    res.status(400).json({
      error: "Demo execution does not accept input data",
    });
    return;
  }

  if (!tryAcquireDemoRun()) {
    res.status(503).json({
      error: {
        code: "DEMO_CONCURRENT_RUN_LIMIT",
        message:
          "Demo is currently busy. Please try again shortly.",
        retryAfterSeconds: null,
      },
    } satisfies DemoErrorResponse);
    return;
  }

  try {
    let quota;

    try {
      quota = await tryConsumeDemoDailyQuota();
    } catch (error) {
      logError("Demo daily quota check failed", error);

      res.status(503).json({
        error: {
          code: "DEMO_TEMPORARILY_UNAVAILABLE",
          message:
            "Demo is temporarily unavailable. Please try again later.",
          retryAfterSeconds: null,
        },
      } satisfies DemoErrorResponse);
      return;
    }

    if (!quota.allowed) {
      if (quota.retryAfterSeconds !== null) {
        res.setHeader(
          "Retry-After",
          String(quota.retryAfterSeconds),
        );
      }

      res.status(429).json({
        error: {
          code: "DEMO_DAILY_LIMIT_REACHED",
          message: "Daily demo limit reached.",
          retryAfterSeconds: quota.retryAfterSeconds,
        },
      } satisfies DemoErrorResponse);
      return;
    }

    res.set(SSE_RESPONSE_HEADERS);

    res.flushHeaders();

    const controller = new AbortController();

    let disconnected = false;

    const onDisconnect = (): void => {
      disconnected = true;
      controller.abort();
    };

    res.on("close", onDisconnect);

    const timeout = setTimeout(() => {
      controller.abort();
    }, WORKFLOW_TIMEOUT_MS);

    const sendEvent = (
      event: WorkflowExecutionEvent,
    ): void => {
      if (
        disconnected ||
        res.destroyed ||
        res.writableEnded
      ) {
        return;
      }

      const safeEvent: WorkflowExecutionEvent =
        event.type === "flow:stop" && event.status === "failed"
          ? {
              type: "flow:stop",
              status: "failed",
              error: "Demo execution failed",
            }
          : event.type === "node:stop" && event.status === "failed"
            ? {
                type: "node:stop",
                nodeId: event.nodeId,
                status: "failed",
                error: "Node execution failed",
              }
            : event;

      res.write(
        `event: ${safeEvent.type}\ndata: ${JSON.stringify(safeEvent)}\n\n`,
      );
    };

    try {
      await executeWorkflow(
        createDemoWorkflow(),
        sendEvent,
        controller.signal,
      );
    } catch (error) {
      logError("Demo execution failed unexpectedly", error);

      sendEvent({
        type: "flow:stop",
        status: "failed",
        error: "Demo execution failed unexpectedly",
      });
    } finally {
      clearTimeout(timeout);
      res.off("close", onDisconnect);

      if (!disconnected && !res.writableEnded) {
        res.end();
      }
    }
  } finally {
    releaseDemoRun();
  }
}
