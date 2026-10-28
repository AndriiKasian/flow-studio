import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDemoWorkflow } from "../demo-api";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const API_URL = "https://api.example.test";

const fetchMock = vi.fn<typeof fetch>();

describe("getDemoWorkflow", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", API_URL);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(Response.json({ nodes: [], edges: [] }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // A request to an API that never wakes must end so the Demo can show
  // Unavailable instead of waiting until the platform ends the response.
  it("requests the uncached demo workflow with a timeout", async () => {
    await getDemoWorkflow();

    const [input, init] = fetchMock.mock.calls[0] ?? [];

    expect(String(input)).toBe(`${API_URL}/api/demo/workflow`);
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects when the API responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response("busy", { status: 503 }));

    await expect(getDemoWorkflow()).rejects.toThrow("HTTP 503");
  });
});
