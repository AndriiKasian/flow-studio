import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

function hash(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True when the request carries the web server's shared proxy secret. */
export function isTrustedProxyRequest(req: Request): boolean {
  const expectedSecret = process.env.TRUSTED_PROXY_SECRET;
  const providedSecret = req.get(TRUSTED_PROXY_SECRET_HEADER);

  if (!expectedSecret || !providedSecret) {
    return false;
  }

  // Hash both values so the comparison is constant-time regardless of length.
  return timingSafeEqual(hash(expectedSecret), hash(providedSecret));
}

/**
 * Resolves the visitor IP for rate limiting.
 *
 * The forwarded client IP header is honoured only when the request carries the
 * shared proxy secret; otherwise `req.ip` is used, which Express derives from
 * `X-Forwarded-For` according to the app's `trust proxy` setting.
 */
export function getClientIp(req: Request): string | undefined {
  if (isTrustedProxyRequest(req)) {
    const forwardedIp = req.get(TRUSTED_CLIENT_IP_HEADER)?.trim();

    if (forwardedIp && isIP(forwardedIp) !== 0) {
      return forwardedIp;
    }
  }

  return req.ip;
}

/** `express-rate-limit` key generator keyed by the resolved visitor IP. */
export function clientIpRateLimitKey(req: Request): string {
  return ipKeyGenerator(getClientIp(req) ?? "");
}
