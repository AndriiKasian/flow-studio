import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";

/**
 * Returns the rightmost `X-Forwarded-For` entry. On Vercel the header is
 * overwritten with the connecting client's IP (client-supplied values are not
 * forwarded), so it holds a single trusted address. Behind a single appending
 * proxy, the rightmost entry is the one that proxy added; earlier entries are
 * client-controlled and ignored.
 */
export function getClientIpFromForwardedFor(
  forwardedFor: string | null,
): string | undefined {
  const rightmost = forwardedFor?.split(",").at(-1)?.trim();

  return rightmost || undefined;
}

/**
 * Headers identifying the visitor to the API so its rate limits apply per
 * visitor rather than to the web server. The client IP is sent only with the
 * shared proxy secret; the API ignores it otherwise. Server-side use only.
 */
export function buildTrustedProxyHeaders(
  incoming: Pick<Headers, "get">,
  proxySecret: string | undefined,
): Record<string, string> {
  if (!proxySecret) {
    return {};
  }

  const clientIp = getClientIpFromForwardedFor(
    incoming.get("x-forwarded-for"),
  );

  if (!clientIp) {
    return {};
  }

  return {
    [TRUSTED_PROXY_SECRET_HEADER]: proxySecret,
    [TRUSTED_CLIENT_IP_HEADER]: clientIp,
  };
}
