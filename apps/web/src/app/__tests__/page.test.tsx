import type { Flow } from "@flow-studio/shared";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getFlows } from "@/lib/flows-api";

import Home from "../page";

vi.mock("@/lib/flows-api", () => ({
  getFlows: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Interactive dialogs and menus are outside the scope of these tests.
vi.mock("@/features/workflows/components/create-workflow-dialog", () => ({
  CreateWorkflowDialog: () => <button>New Workflow</button>,
}));

vi.mock("@/features/workflows/components/workflow-actions", () => ({
  WorkflowActions: () => null,
}));

const getFlowsMock = vi.mocked(getFlows);

const flow: Flow = {
  id: "3f2b8c1e-9a4d-4e6f-8b7a-2c5d1e0f9a3b",
  name: "Persisted workflow",
  description: null,
  graph: { nodes: [], edges: [] },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

const FALLBACK_TEXT = "Connecting to demo server…";
const ERROR_TEXT = "Workflows unavailable";

// Renders the page as Next.js streams it and returns the HTML sent before any
// Suspense boundary resolves, plus a reader for the remaining stream.
async function renderShell() {
  const stream = await renderToReadableStream(<Home />);
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  async function readUntil(isComplete: (html: string) => boolean) {
    let html = "";

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        return html;
      }

      html += decoder.decode(value, { stream: true });

      if (isComplete(html)) {
        return html;
      }
    }
  }

  const shell = await readUntil((html) => html.includes("</main>"));

  return { shell, readRest: () => readUntil(() => false) };
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    getFlowsMock.mockReset();
    vi.restoreAllMocks();
  });

  it("sends the shell and Demo card before workflows load", async () => {
    // Never settles, like a request to an API that is still waking up.
    getFlowsMock.mockReturnValue(new Promise(() => undefined));

    const { shell } = await renderShell();

    expect(getFlowsMock).toHaveBeenCalledTimes(1);
    expect(shell).toContain("Workflows");
    expect(shell).toContain("New Workflow");
    expect(shell).toContain("AI Research Demo");
    expect(shell).toContain('href="/workflows/demo"');
    expect(shell).toContain(FALLBACK_TEXT);
    expect(shell).not.toContain(ERROR_TEXT);
  });

  it("streams loaded workflows after the shell", async () => {
    let resolveFlows: (flows: Flow[]) => void = () => undefined;
    getFlowsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFlows = resolve;
      }),
    );

    const { shell, readRest } = await renderShell();

    expect(shell).toContain(FALLBACK_TEXT);
    expect(shell).not.toContain(flow.name);

    resolveFlows([flow]);
    const rest = await readRest();

    expect(rest).toContain(flow.name);
    expect(rest).toContain(`href="/workflows/${flow.id}"`);
    expect(rest).not.toContain(ERROR_TEXT);
  });

  it("shows a recoverable error without hiding the Demo card", async () => {
    getFlowsMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:3001"),
    );

    const { shell, readRest } = await renderShell();
    const html = shell + (await readRest());

    expect(html).toContain("AI Research Demo");
    expect(html).toContain(ERROR_TEXT);
    expect(html).toContain("Retry");
    expect(html).not.toContain("ECONNREFUSED");
  });

  it("renders no workflow cards or error for an empty list", async () => {
    getFlowsMock.mockResolvedValue([]);

    const { shell, readRest } = await renderShell();
    const html = shell + (await readRest());

    expect(html).toContain("AI Research Demo");
    expect(html).not.toContain(ERROR_TEXT);
    expect(html.match(/<article/g)).toHaveLength(1);
  });

  it("requests workflows again on every render", async () => {
    getFlowsMock.mockRejectedValueOnce(new Error("timeout"));
    getFlowsMock.mockResolvedValueOnce([flow]);

    const first = await renderShell();
    const failed = first.shell + (await first.readRest());
    const second = await renderShell();
    const recovered = second.shell + (await second.readRest());

    expect(getFlowsMock).toHaveBeenCalledTimes(2);
    expect(failed).toContain(ERROR_TEXT);
    expect(recovered).toContain(flow.name);
    expect(recovered).not.toContain(ERROR_TEXT);
  });
});
