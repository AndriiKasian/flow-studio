import type { WorkflowExecutionEvent } from "@flow-studio/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { streamExecution } from "../execution-stream";

// The real fetchEventSource runs against these browser globals, so the tests
// exercise its actual SSE parsing, close, abort and error handling.
const fetchMock = vi.fn<typeof fetch>();

const flowStart: WorkflowExecutionEvent = { type: "flow:start" };

const completed: WorkflowExecutionEvent = {
  type: "flow:stop",
  status: "completed",
};

const failed: WorkflowExecutionEvent = {
  type: "flow:stop",
  status: "failed",
  error: "Web Search failed",
};

function sse(...events: WorkflowExecutionEvent[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

// A stream that sends `text` and then ends, or stays open when `keepOpen`.
function streamResponse(text: string, keepOpen = false): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));

      if (!keepOpen) {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function run(
  controller = new AbortController(),
  onEvent: (event: WorkflowExecutionEvent) => void = vi.fn(),
) {
  return streamExecution({
    url: "/api/demo/run",
    controller,
    onEvent,
    getStartErrorMessage: (_body, status) => `Start failed: HTTP ${status}`,
  });
}

describe("streamExecution", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      fetch: fetchMock,
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal("document", {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the request body as JSON to the given URL", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse(completed)));

    await streamExecution({
      url: "/api/flows/abc/execute/stream",
      body: '{"nodes":[],"edges":[]}',
      controller: new AbortController(),
      onEvent: vi.fn(),
      getStartErrorMessage: () => "",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;

    expect(url).toBe("/api/flows/abc/execute/stream");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"nodes":[],"edges":[]}');
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("resolves completed after a successful flow:stop", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse(flowStart, completed)));
    const controller = new AbortController();
    const onEvent = vi.fn();

    await expect(run(controller, onEvent)).resolves.toEqual({
      status: "completed",
    });

    expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
      flowStart,
      completed,
    ]);
    expect(controller.signal.aborted).toBe(true);
  });

  it("resolves failed with the run's error for a failed flow:stop", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse(flowStart, failed)));

    await expect(run()).resolves.toEqual({
      status: "failed",
      error: "Web Search failed",
    });
  });

  it("uses a generic error for a failed flow:stop without details", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(sse({ type: "flow:stop", status: "failed" })),
    );

    await expect(run()).resolves.toEqual({
      status: "failed",
      error: "Workflow execution failed",
    });
  });

  it("resolves rejected with the start error when the request is refused", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "Too many requests" }, { status: 429 }),
    );
    const onEvent = vi.fn();

    await expect(run(undefined, onEvent)).resolves.toEqual({
      status: "rejected",
      error: "Start failed: HTTP 429",
    });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the stream closes before flow:stop",
      () => streamResponse(sse(flowStart)),
    ],
    [
      "the connection fails",
      () => Promise.reject(new TypeError("Failed to fetch")),
    ],
    [
      "the response is not an event stream",
      () => Promise.resolve(Response.json({ ok: true })),
    ],
    [
      "an event is malformed",
      () => streamResponse(`${sse(flowStart)}data: {not json\n\n`),
    ],
  ])("resolves interrupted when %s", async (_, respond) => {
    fetchMock.mockImplementation(async () => respond());

    await expect(run()).resolves.toEqual({ status: "interrupted" });
  });

  it("resolves interrupted when aborted before flow:stop", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse(flowStart), true));
    const controller = new AbortController();

    await expect(
      run(controller, () => controller.abort()),
    ).resolves.toEqual({ status: "interrupted" });
  });

  it.each([
    ["completed then failed", [completed, failed], { status: "completed" }],
    [
      "failed then completed",
      [failed, completed],
      { status: "failed", error: "Web Search failed" },
    ],
  ])(
    "keeps the first terminal event when %s arrive",
    async (_, terminalEvents, expected) => {
      fetchMock.mockResolvedValue(
        streamResponse(sse(flowStart, ...terminalEvents, completed)),
      );
      const onEvent = vi.fn();

      await expect(run(undefined, onEvent)).resolves.toEqual(expected);
      expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
        flowStart,
        terminalEvents[0],
      ]);
    },
  );
});
