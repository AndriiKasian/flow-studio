import type { DemoErrorResponse } from "@flow-studio/shared";
import type { NextFunction, Request, Response } from "express";

import { isLocalEnvironment } from "../lib/environment.js";
import { isTrustedProxyRequest } from "../lib/trusted-proxy.js";

/**
 * Outside local development, demo runs are accepted only from the web app's
 * proxy. Direct calls to the API cannot bypass per-visitor rate limiting, and
 * the API never depends on its hosting platform's X-Forwarded-For chain.
 */
export function requireTrustedDemoProxy(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isLocalEnvironment() || isTrustedProxyRequest(req)) {
    next();
    return;
  }

  if (!process.env.TRUSTED_PROXY_SECRET) {
    console.error("TRUSTED_PROXY_SECRET is not configured");

    res.status(503).json({
      error: {
        code: "DEMO_TEMPORARILY_UNAVAILABLE",
        message: "Demo is temporarily unavailable. Please try again later.",
        retryAfterSeconds: null,
      },
    } satisfies DemoErrorResponse);
    return;
  }

  res.status(403).json({
    error: {
      code: "DEMO_PROXY_REQUIRED",
      message: "Demo runs must be started from the Flow Studio web app.",
      retryAfterSeconds: null,
    },
  } satisfies DemoErrorResponse);
}
