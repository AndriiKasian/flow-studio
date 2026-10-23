import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteFlow, getFlow, saveFlowGraph, updateFlow } from "../flows-api";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const API_URL = "https://api.example.test";

// Each ID would change the requested API path if interpolated unencoded.
const unsafeIds = [
  ["slash", "abc/graph", "abc%2Fgraph"],
  ["path traversal", "../api/demo/run", "..%2Fapi%2Fdemo%2Frun"],
  ["query", "abc?x=1", "abc%3Fx%3D1"],
  ["fragment", "abc#x", "abc%23x"],
] as const;

const fetchMock = vi.fn<typeof fetch>();

function requestedUrl(): URL {
  const [input] = fetchMock.mock.calls[0] ?? [];

  return new URL(String(input));
}

describe("flows API path encoding", () => {
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

  describe.each(unsafeIds)("with a %s in the ID", (_, id, encodedId) => {
    it.each([
      ["getFlow", () => getFlow(id), `/flows/${encodedId}`],
      ["updateFlow", () => updateFlow(id, { name: "Flow" }), `/flows/${encodedId}`],
      ["deleteFlow", () => deleteFlow(id), `/flows/${encodedId}`],
      [
        "saveFlowGraph",
        () => saveFlowGraph(id, { nodes: [], edges: [] }),
        `/flows/${encodedId}/graph`,
      ],
    ])("%s keeps the ID in a single path segment", async (_, call, path) => {
      await call();

      const url = requestedUrl();

      expect(url.origin).toBe(API_URL);
      expect(url.pathname).toBe(path);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    });
  });
});
