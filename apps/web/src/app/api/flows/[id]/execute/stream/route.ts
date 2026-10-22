import { NextRequest } from "next/server";

import { buildTrustedProxyHeaders } from "@/lib/trusted-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    console.error("Failed to proxy workflow execution:", error);

    return Response.json(
      { error: "Failed to connect to execution service" },
      { status: 502 },
    );
  }
}