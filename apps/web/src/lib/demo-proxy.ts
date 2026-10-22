import { buildTrustedProxyHeaders } from "./trusted-proxy";

/** Builds the headers sent to the API demo endpoint. */
export function buildDemoProxyHeaders(
  incoming: Headers,
  proxySecret: string | undefined,
): Headers {
  return new Headers({
    Accept: "text/event-stream",
    ...buildTrustedProxyHeaders(incoming, proxySecret),
  });
}

/**
 * Headers for relaying an upstream demo error response, preserving
 * `Retry-After` for rate-limit and quota responses.
 */
export function buildDemoErrorResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers({
    "Content-Type": upstream.get("content-type") ?? "application/json",
  });

  const retryAfter = upstream.get("retry-after");

  if (retryAfter) {
    headers.set("Retry-After", retryAfter);
  }

  return headers;
}
