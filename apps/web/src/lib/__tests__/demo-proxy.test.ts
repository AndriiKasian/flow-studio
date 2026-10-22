import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import {
  buildDemoErrorResponseHeaders,
  buildDemoProxyHeaders,
} from "../demo-proxy";

describe("buildDemoProxyHeaders", () => {
  const incoming = new Headers({
    "x-forwarded-for": "1.2.3.4, 203.0.113.10",
  });

  it("requests an event stream and forwards the visitor IP", () => {
    const headers = buildDemoProxyHeaders(incoming, "secret");

    expect(headers.get("accept")).toBe("text/event-stream");
    expect(headers.get(TRUSTED_PROXY_SECRET_HEADER)).toBe("secret");
    expect(headers.get(TRUSTED_CLIENT_IP_HEADER)).toBe("203.0.113.10");
  });

  it("does not forward the visitor IP without a configured secret", () => {
    const headers = buildDemoProxyHeaders(incoming, undefined);

    expect(headers.has(TRUSTED_PROXY_SECRET_HEADER)).toBe(false);
    expect(headers.has(TRUSTED_CLIENT_IP_HEADER)).toBe(false);
  });
});

describe("buildDemoErrorResponseHeaders", () => {
  it("preserves Retry-After and content type", () => {
    const headers = buildDemoErrorResponseHeaders(
      new Headers({
        "content-type": "application/json; charset=utf-8",
        "retry-after": "120",
      }),
    );

    expect(headers.get("retry-after")).toBe("120");
    expect(headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("omits Retry-After when the upstream response has none", () => {
    const headers = buildDemoErrorResponseHeaders(new Headers());

    expect(headers.has("retry-after")).toBe(false);
    expect(headers.get("content-type")).toBe("application/json");
  });
});
