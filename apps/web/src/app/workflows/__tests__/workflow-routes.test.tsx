import type { Flow, WorkflowGraph } from "@flow-studio/shared";
import type { ReactNode } from "react";
import { renderToReadableStream, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackendRetryProvider } from "@/features/workflows/components/backend-status";
import { WorkflowEditorPlaceholder } from "@/features/workflows/components/workflow-editor-placeholder";
import { getDemoWorkflow } from "@/lib/demo-api";
import { getFlow } from "@/lib/flows-api";

import WorkflowPage from "../[id]/page";
import DemoPage from "../demo/page";

const NOT_FOUND = "NEXT_NOT_FOUND";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error(NOT_FOUND);
  }),
}));

vi.mock("@/lib/flows-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/flows-api")>()),
  getFlow: vi.fn(),
}));

vi.mock("@/lib/demo-api", () => ({
  getDemoWorkflow: vi.fn(),
}));

// The React Flow editors are client-only and outside the scope of these
// tests; the stubs show which one the route rendered.
vi.mock("@/features/workflows/components/workflow-editor", () => ({
  WorkflowEditor: ({ flow }: { flow: Flow }) => (
    <div data-editor="workflow">{flow.name}</div>
  ),
}));

vi.mock("@/features/workflows/components/workflow-demo", () => ({
  WorkflowDemo: ({ graph }: { graph: WorkflowGraph }) => (
    <div data-editor="demo">{`${graph.nodes.length} demo nodes`}</div>
  ),
}));

const getFlowMock = vi.mocked(getFlow);
const getDemoWorkflowMock = vi.mocked(getDemoWorkflow);

const FLOW_ID = "3f2b8c1e-9a4d-4e6f-8b7a-2c5d1e0f9a3b";

const flow: Flow = {
  id: FLOW_ID,
  name: "Persisted workflow",
  description: null,
  graph: { nodes: [], edges: [] },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

const demoGraph: WorkflowGraph = {
  nodes: [
    {
      id: "input",
      type: "textInput",
      position: { x: 0, y: 0 },
      data: { text: "" },
    },
  ],
  edges: [],
};

const CONNECTING_TEXT = "Connecting to backend…";
const UNAVAILABLE_TEXT = "Workflow unavailable";
const EDITOR_MARKUP = `<div data-editor="workflow">${flow.name}</div>`;
const DEMO_MARKUP = '<div data-editor="demo">1 demo nodes</div>';

// Renders the page as Next.js streams it and returns the HTML sent before any
// Suspense boundary resolves, plus a reader for the remaining stream. The
// page is wrapped in an element like the root layout's <body>: React holds a
// shell whose top-level Suspense boundary might still render <html> or <body>.
async function renderShell(page: ReactNode) {
  const stream = await renderToReadableStream(<div>{page}</div>, {
    // Errors thrown inside a boundary, such as notFound(), are reported here.
    onError: () => undefined,
  });
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

function workflowPage(id = FLOW_ID) {
  return WorkflowPage({ params: Promise.resolve({ id }) });
}

// Each route paired with its backend request mock and the success markup.
const routes = [
  {
    name: "workflow editor",
    render: () => workflowPage(),
    request: getFlowMock as ReturnType<typeof vi.fn>,
    data: flow as unknown,
    ready: EDITOR_MARKUP,
  },
  {
    name: "Demo",
    render: async () => DemoPage(),
    request: getDemoWorkflowMock as ReturnType<typeof vi.fn>,
    data: demoGraph as unknown,
    ready: DEMO_MARKUP,
  },
];

describe.each(routes)("$name route", ({ render, request, data, ready }) => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    getFlowMock.mockReset();
    getDemoWorkflowMock.mockReset();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("sends the shared skeleton before the backend responds", async () => {
    // Never settles, like a request to an API that is still waking up.
    request.mockReturnValue(new Promise(() => undefined));

    const { shell } = await renderShell(await render());

    expect(request).toHaveBeenCalledTimes(1);
    expect(shell).toContain(
      renderToString(<WorkflowEditorPlaceholder status="connecting" />),
    );
    expect(shell).toContain(CONNECTING_TEXT);
    expect(shell).toContain("Server status: </span>Connecting");
    expect(shell).not.toContain(UNAVAILABLE_TEXT);
    expect(shell).not.toContain(ready);
  });

  it("streams in the editor once the backend responds", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((settle) => (resolve = settle)));

    const { shell, readRest } = await renderShell(await render());

    resolve(data);
    const rest = await readRest();

    expect(shell).toContain(CONNECTING_TEXT);
    expect(rest).toContain(ready);
    expect(rest).not.toContain(UNAVAILABLE_TEXT);
  });

  it.each([
    ["network failure", new Error("connect ECONNREFUSED 10.0.0.1:3001")],
    [
      "timeout",
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    ],
    ["server error", new Error("Failed to fetch flow")],
  ])("shows Unavailable with Retry after a %s", async (_, error) => {
    request.mockRejectedValue(error);

    const { notFound } = await import("next/navigation");
    const { readRest } = await renderShell(await render());
    const rest = await readRest();

    expect(rest).toContain(
      renderToString(
        <BackendRetryProvider>
          <WorkflowEditorPlaceholder status="unavailable" />
        </BackendRetryProvider>,
      ),
    );
    expect(rest).toContain('role="alert"');
    expect(rest).toContain(UNAVAILABLE_TEXT);
    expect(rest).toContain("Retry");
    expect(rest).not.toContain("ECONNREFUSED");
    expect(rest).not.toContain(ready);
    expect(notFound).not.toHaveBeenCalled();
  });

  // Retry refreshes the router, which renders the page again on the server.
  it("requests the backend again on retry and recovers", async () => {
    request.mockRejectedValueOnce(new Error("timeout"));
    request.mockResolvedValueOnce(data);

    const first = await renderShell(await render());
    const failed = first.shell + (await first.readRest());
    const second = await renderShell(await render());
    const recovered = second.shell + (await second.readRest());

    expect(request).toHaveBeenCalledTimes(2);
    expect(failed).toContain(UNAVAILABLE_TEXT);
    expect(recovered).toContain(ready);
    expect(recovered).not.toContain(UNAVAILABLE_TEXT);
  });
});

describe("Missing workflows", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    getFlowMock.mockReset();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("calls notFound when the API responds 404", async () => {
    getFlowMock.mockResolvedValue(null);

    const { notFound } = await import("next/navigation");
    const { readRest } = await renderShell(await workflowPage());
    const rest = await readRest();

    expect(getFlowMock).toHaveBeenCalledWith(FLOW_ID);
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(rest).not.toContain(UNAVAILABLE_TEXT);
    expect(rest).not.toContain(EDITOR_MARKUP);
  });

  // Rejected before streaming starts, so the response keeps a 404 status.
  it("rejects a malformed ID before streaming or requesting the API", async () => {
    const { notFound } = await import("next/navigation");

    await expect(workflowPage("not-a-uuid")).rejects.toThrow(NOT_FOUND);

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(getFlowMock).not.toHaveBeenCalled();
  });
});
