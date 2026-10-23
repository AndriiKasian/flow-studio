import { NextRequest } from "next/server";

import { isFlowId } from "@/lib/flows-api";
import { buildTrustedProxyHeaders } from "@/lib/trusted-proxy";
import {
  CLIENT_CLOSED_REQUEST_STATUS,
  SSE_RESPONSE_HEADERS,
} from "@/lib/sse-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keeps the function alive for the whole relayed stream on Vercel.
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return Response.json(
      { error: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const { id } = await params;

  if (!isFlowId(id)) {
    return Response.json(
      { error: "Flow not found" },
      { status: 404 },
    );
  }

  try {
    const response = await fetch(
      `${apiUrl}/flows/${encodeURIComponent(id)}/execute/stream`,
      {
        method: "POST",
        cache: "no-store",
        signal: request.signal,
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          ...buildTrustedProxyHeaders(
            request.headers,
            process.env.TRUSTED_PROXY_SECRET,
          ),
        },
        body: await request.text(),
      },
    );

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("content-type") ??
            "application/json",
        },
      });
    }

    if (!response.body) {
      return Response.json(
        { error: "Execution stream is unavailable" },
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

    console.error("Failed to proxy workflow execution:", error);

    return Response.json(
      { error: "Failed to connect to execution service" },
      { status: 502 },
    );
  }
}