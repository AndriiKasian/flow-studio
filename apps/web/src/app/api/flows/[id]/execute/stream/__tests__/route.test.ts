import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "../route";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const API_URL = "https://api.example.test";
const FLOW_ID = "3f2b8c1e-9a4d-4e6f-8b7a-2c5d1e0f9a3b";
const GRAPH_BODY = JSON.stringify({ nodes: [], edges: [] });

const fetchMock = vi.fn<typeof fetch>();

function postStream(id: string): Promise<Response> {
  const request = new Request(
    "https://web.example.test/api/flows/x/execute/stream",
    { method: "POST", body: GRAPH_BODY },
  ) as NextRequest;

  return POST(request, { params: Promise.resolve({ id }) });
}

describe("workflow execution stream proxy", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response("event: flow:start\ndata: {}\n\n", {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("relays the stream for a workflow UUID", async () => {
    const response = await postStream(FLOW_ID);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(input));

    expect(url.origin).toBe(API_URL);
    expect(url.pathname).toBe(`/flows/${FLOW_ID}/execute/stream`);
    expect(init?.body).toBe(GRAPH_BODY);
  });

  it.each([
    ["parent-directory segment", ".."],
    ["path traversal", "../api/demo/run"],
    ["slash", "abc/graph"],
    ["query", "abc?x=1"],
    ["malformed UUID", "3f2b8c1e-9a4d-4e6f-8b7a"],
    ["empty string", ""],
  ])("rejects a %s without calling the API", async (_, id) => {
    const response = await postStream(id);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Flow not found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
