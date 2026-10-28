import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteFlow,
  getFlow,
  getFlows,
  saveFlowGraph,
  updateFlow,
} from "../flows-api";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const API_URL = "https://api.example.test";
const FLOW_ID = "3f2b8c1e-9a4d-4e6f-8b7a-2c5d1e0f9a3b";

// Each ID would change the requested API path, or is not a workflow ID.
const invalidIds = [
  ["current-directory segment", "."],
  ["parent-directory segment", ".."],
  ["slash", "abc/graph"],
  ["path traversal", "../api/demo/run"],
  ["query", "abc?x=1"],
  ["fragment", "abc#x"],
  ["malformed UUID", "3f2b8c1e-9a4d-4e6f-8b7a"],
  ["empty string", ""],
] as const;

const fetchMock = vi.fn<typeof fetch>();

function requestedUrl(): URL {
  const [input] = fetchMock.mock.calls[0] ?? [];

  return new URL(String(input));
}

describe("flows API workflow IDs", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json({}));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ["getFlow", () => getFlow(FLOW_ID), `/flows/${FLOW_ID}`],
    ["updateFlow", () => updateFlow(FLOW_ID, { name: "Flow" }), `/flows/${FLOW_ID}`],
    ["deleteFlow", () => deleteFlow(FLOW_ID), `/flows/${FLOW_ID}`],
    [
      "saveFlowGraph",
      () => saveFlowGraph(FLOW_ID, { nodes: [], edges: [] }),
      `/flows/${FLOW_ID}/graph`,
    ],
  ])("%s requests the workflow by UUID", async (_, call, path) => {
    await call();

    const url = requestedUrl();

    expect(url.origin).toBe(API_URL);
    expect(url.pathname).toBe(path);
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });

  describe.each(invalidIds)("with a %s ID", (_, id) => {
    it("getFlow returns null without requesting the API", async () => {
      await expect(getFlow(id)).resolves.toBeNull();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ["updateFlow", () => updateFlow(id, { name: "Flow" })],
      ["deleteFlow", () => deleteFlow(id)],
      ["saveFlowGraph", () => saveFlowGraph(id, { nodes: [], edges: [] })],
    ])("%s rejects without requesting the API", async (_, call) => {
      await expect(call()).rejects.toThrow("Invalid workflow ID");

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

describe("getFlows", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json([]));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Retry after a failed load must reach the API rather than reuse a cached
  // response, and a request to an unavailable API must not hang indefinitely.
  it("requests uncached workflows with a timeout", async () => {
    await getFlows();

    const [, init] = fetchMock.mock.calls[0] ?? [];

    expect(requestedUrl().pathname).toBe("/flows");
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects when the API responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getFlows()).rejects.toThrow("Failed to fetch flows");
  });
});

describe("getFlow", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json({}));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Like getFlows: Retry must reach the API, and a request to an API that
  // never wakes must end so the editor can show Unavailable.
  it("requests an uncached workflow with a timeout", async () => {
    await getFlow(FLOW_ID);

    const [, init] = fetchMock.mock.calls[0] ?? [];

    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns null only when the API responds 404", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getFlow(FLOW_ID)).resolves.toBeNull();
  });

  it("rejects when the API responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getFlow(FLOW_ID)).rejects.toThrow("Failed to fetch flow");
  });
});
