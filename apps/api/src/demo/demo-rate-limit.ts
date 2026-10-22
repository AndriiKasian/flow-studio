import { rateLimit } from "express-rate-limit";
import type { DemoErrorResponse } from "@flow-studio/shared";
import type { Request } from "express";

import { clientIpRateLimitKey } from "../lib/trusted-proxy.js";

type RateLimitedRequest = Request & {
  rateLimit?: {
    resetTime?: Date;
  };
};

export const demoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: clientIpRateLimitKey,
  handler: (req, res, _next, options) => {
    const rateLimitedReq = req as RateLimitedRequest;

    const resetTime = rateLimitedReq.rateLimit?.resetTime;

    const retryAfterSeconds = resetTime
      ? Math.max(
          1,
          Math.ceil(
            (resetTime.getTime() - Date.now()) / 1000,
          ),
        )
      : Math.ceil(options.windowMs / 1000);

    res.setHeader(
      "Retry-After",
      String(retryAfterSeconds),
    );

    res.status(429).json({
      error: {
        code: "DEMO_RATE_LIMIT_EXCEEDED",
        message: "Too many demo runs.",
        retryAfterSeconds,
      },
    } satisfies DemoErrorResponse);
  },
});
