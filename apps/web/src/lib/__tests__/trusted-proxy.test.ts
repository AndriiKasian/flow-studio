import {
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_PROXY_SECRET_HEADER,
} from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import {
  buildTrustedProxyHeaders,
  getClientIpFromForwardedFor,
} from "../trusted-proxy";

describe("getClientIpFromForwardedFor", () => {
  it("uses the rightmost entry appended by the trusted proxy", () => {
    expect(
      getClientIpFromForwardedFor("1.2.3.4, 203.0.113.10"),
    ).toBe("203.0.113.10");
  });

  it("returns undefined when the header is missing or empty", () => {
    expect(getClientIpFromForwardedFor(null)).toBeUndefined();
    expect(getClientIpFromForwardedFor(" ")).toBeUndefined();
  });
});

describe("buildTrustedProxyHeaders", () => {
  const incoming = new Headers({
    "x-forwarded-for": "1.2.3.4, 203.0.113.10",
    [TRUSTED_CLIENT_IP_HEADER]: "9.9.9.9",
    [TRUSTED_PROXY_SECRET_HEADER]: "client-supplied",
  });

  it("forwards the visitor IP with the configured secret", () => {
    expect(buildTrustedProxyHeaders(incoming, "secret")).toEqual({
      [TRUSTED_PROXY_SECRET_HEADER]: "secret",
      [TRUSTED_CLIENT_IP_HEADER]: "203.0.113.10",
    });
  });

  it("never relays client-supplied proxy headers without a secret", () => {
    expect(buildTrustedProxyHeaders(incoming, undefined)).toEqual({});
  });

  it("sends nothing when the visitor IP is unknown", () => {
    expect(buildTrustedProxyHeaders(new Headers(), "secret")).toEqual({});
  });
});
