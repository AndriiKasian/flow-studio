import { NextRequest } from "next/server";

import {
  buildDemoErrorResponseHeaders,
  buildDemoProxyHeaders,
} from "@/lib/demo-proxy";
import {
  CLIENT_CLOSED_REQUEST_STATUS,
  SSE_RESPONSE_HEADERS,
} from "@/lib/sse-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The demo run may stream for up to 45 seconds (API timeout); keep the
// function alive for the whole relayed stream on Vercel.
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
): Promise<Response> {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return Response.json(
      { error: "API_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${apiUrl}/api/demo/run`, {
      method: "POST",
      cache: "no-store",
      signal: request.signal,
      headers: buildDemoProxyHeaders(
        request.headers,
        process.env.TRUSTED_PROXY_SECRET,
      ),
    });

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: buildDemoErrorResponseHeaders(response.headers),
      });
    }

    if (!response.body) {
      return Response.json(
        { error: "Demo execution stream is unavailable" },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: SSE_RESPONSE_HEADERS,
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, {
        status: CLIENT_CLOSED_REQUEST_STATUS,
      });
    }

    console.error("Failed to proxy demo execution:", error);

    return Response.json(
      { error: "Failed to connect to demo execution service" },
      { status: 502 },
    );
  }
}