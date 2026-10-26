import type { Flow } from "@flow-studio/shared";
import { renderToReadableStream, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BackendStatus } from "@/features/workflows/components/backend-status";
import { WorkflowCard } from "@/features/workflows/components/workflow-card";
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

const DEMO_NAME = "AI Research Demo";
const DEMO_HREF = 'href="/workflows/demo"';
const FALLBACK_TEXT = "Connecting to demo server…";
const ERROR_TEXT = "Workflows unavailable";
const DISABLED_LINK = '<a role="link" aria-disabled="true">';

// Labels of the shared backend status badges, in document order.
function statusLabels(html: string): string[] {
  return Array.from(
    html.matchAll(/Server status: <\/span>(?:<!-- -->)?(\w+)/g),
    ([, label]) => label,
  );
}

// The shared status badge markup, which every card renders in its footer.
function statusBadge(html: string): string | undefined {
  return html.match(
    /<span class="inline-flex[^"]*"><svg[\s\S]*?<\/svg><span class="sr-only">Server status: <\/span>(?:<!-- -->)?\w+<\/span>/,
  )?.[0];
}

function articles(html: string): string[] {
  return html.match(/<article[\s\S]*?<\/article>/g) ?? [];
}

function articleFor(html: string, name: string): string {
  const article = articles(html).find((markup) => markup.includes(name));

  if (!article) {
    throw new Error(`No card for ${name}`);
  }

  return article;
}

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

// Content streamed for the Suspense boundary that a shell placeholder
// identifies, e.g. "B:0" -> the markup React moves into that boundary.
function resolvedBoundary(rest: string, boundaryId: string): string {
  const segmentId = rest.match(
    new RegExp(`\\$RC\\("${boundaryId}","(S:\\d+)"\\)`),
  )?.[1];
  const segment = segmentId
    ? rest.match(
        new RegExp(`<div hidden id="${segmentId}">([\\s\\S]*?)</div><script>`),
      )
    : null;

  if (!segment) {
    throw new Error(`Boundary ${boundaryId} did not resolve`);
  }

  return segment[1];
}

function pendingFlows(): (flows: Flow[]) => void {
  let resolveFlows: (flows: Flow[]) => void = () => undefined;

  getFlowsMock.mockReturnValue(
    new Promise((resolve) => {
      resolveFlows = resolve;
    }),
  );

  return (flows) => resolveFlows(flows);
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    getFlowsMock.mockReset();
    vi.restoreAllMocks();
  });

  it("sends the shell before the backend responds", async () => {
    // Never settles, like a request to an API that is still waking up.
    getFlowsMock.mockReturnValue(new Promise(() => undefined));

    const { shell } = await renderShell();

    expect(getFlowsMock).toHaveBeenCalledTimes(1);
    expect(shell).toContain("Workflows");
    expect(shell).toContain("New Workflow");
    expect(shell).toContain(FALLBACK_TEXT);
    expect(shell).not.toContain(ERROR_TEXT);
  });

  it("shows the full Demo card with navigation disabled while Connecting", async () => {
    getFlowsMock.mockReturnValue(new Promise(() => undefined));

    const { shell } = await renderShell();
    const demo = articleFor(shell, DEMO_NAME);

    expect(demo).toContain("Read-only demo");
    expect(demo).toContain("Explore a live AI workflow");
    expect(statusLabels(demo)).toEqual(["Connecting"]);
    expect(demo).toContain(`${DISABLED_LINK}${DEMO_NAME}</a>`);
    expect(shell).not.toContain(DEMO_HREF);
  });

  it("enables Demo navigation once the backend is Ready", async () => {
    const resolveFlows = pendingFlows();
    const { readRest } = await renderShell();

    resolveFlows([flow]);
    const demo = articleFor(await readRest(), DEMO_NAME);

    expect(statusLabels(demo)).toEqual(["Ready"]);
    // Title and arrow both link to the Demo.
    expect(demo.match(new RegExp(DEMO_HREF, "g"))).toHaveLength(2);
    expect(demo).not.toContain("aria-disabled");
  });

  it("keeps Demo navigation disabled and offers Retry when Unavailable", async () => {
    getFlowsMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:3001"),
    );

    const { shell, readRest } = await renderShell();
    const rest = await readRest();
    const html = shell + rest;
    const demo = articleFor(rest, DEMO_NAME);

    expect(getFlowsMock).toHaveBeenCalledTimes(1);
    expect(statusLabels(demo)).toEqual(["Unavailable"]);
    expect(demo).toContain(DISABLED_LINK);
    expect(html).not.toContain(DEMO_HREF);
    expect(html).toContain(ERROR_TEXT);
    expect(html).toContain("Retry");
    expect(html).not.toContain("ECONNREFUSED");
  });

  it("renders the same Ready footer on the Demo and workflow cards", async () => {
    const resolveFlows = pendingFlows();
    const { shell, readRest } = await renderShell();

    expect(shell).not.toContain(flow.name);

    resolveFlows([flow]);
    const rest = await readRest();
    const demo = articleFor(rest, DEMO_NAME);
    const workflow = articleFor(rest, flow.name);

    expect(getFlowsMock).toHaveBeenCalledTimes(1);
    expect(statusBadge(workflow)).toBeDefined();
    expect(statusBadge(workflow)).toBe(statusBadge(demo));
    expect(statusLabels(workflow)).toEqual(["Ready"]);
    expect(workflow).toContain(`href="/workflows/${flow.id}"`);
    // The update date moves to the card header and is kept as metadata.
    expect(workflow).toMatch(
      new RegExp(
        `Updated(?:<!-- -->)? <time dateTime="${flow.updatedAt}">Oct 2, 2026</time>`,
      ),
    );
    expect(rest).not.toContain(ERROR_TEXT);
  });

  it("renders a loading placeholder in the shared card structure", async () => {
    getFlowsMock.mockReturnValue(new Promise(() => undefined));

    const { shell } = await renderShell();
    const placeholder = shell.slice(
      shell.lastIndexOf('<div class="bg-card', shell.indexOf(FALLBACK_TEXT)),
      shell.indexOf("</main>"),
    );

    expect(placeholder).toContain("size-10 shrink-0 animate-pulse rounded-lg");
    expect(statusBadge(placeholder)).toBeDefined();
    expect(statusBadge(placeholder)).toBe(
      statusBadge(articleFor(shell, DEMO_NAME)),
    );
    // One spinner (the status badge), no invented workflow content or links.
    expect(placeholder.match(/animate-spin/g)).toHaveLength(1);
    expect(placeholder).not.toContain("href=");
    expect(placeholder).not.toContain("Updated");
  });

  it("renders only the Ready Demo card for an empty list", async () => {
    getFlowsMock.mockResolvedValue([]);

    const { readRest } = await renderShell();
    const rest = await readRest();

    expect(articles(rest)).toHaveLength(1);
    expect(statusLabels(articleFor(rest, DEMO_NAME))).toEqual(["Ready"]);
    expect(rest).toContain(DEMO_HREF);
    expect(rest).not.toContain(ERROR_TEXT);
  });

  it("announces status changes through a single polite live region", async () => {
    const resolveFlows = pendingFlows();
    const { shell, readRest } = await renderShell();

    const liveRegions = shell.match(/aria-live="[^"]*"/g) ?? [];
    const region = shell.match(
      /<p aria-live="polite" class="sr-only"><!--\$\?--><template id="(B:\d+)"><\/template><!--\/\$--><\/p>/,
    );

    // Silent while Connecting; badges inside cards are not live regions.
    expect(liveRegions).toHaveLength(1);
    expect(region).not.toBeNull();
    expect(shell).not.toContain('role="status"');

    resolveFlows([flow]);
    const announcement = resolvedBoundary(await readRest(), region?.[1] ?? "");

    expect(statusLabels(announcement)).toEqual(["Ready"]);
    expect(announcement).not.toContain(DEMO_NAME);
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

describe("WorkflowCard navigation guard", () => {
  it.each<BackendStatus>(["connecting", "unavailable"])(
    "renders no focusable or activatable link while %s",
    (status) => {
      const html = renderToString(<WorkflowCard flow={flow} status={status} />);

      // An <a> without href is neither in the tab order nor activated by
      // Enter or click, so the disabled title cannot navigate.
      expect(html).toContain(`${DISABLED_LINK}${flow.name}</a>`);
      expect(html).not.toContain("href=");
      expect(html).not.toContain("tabindex");
      expect(html).not.toContain(`aria-label="Open ${flow.name}"`);
    },
  );

  it("links the title and arrow when Ready", () => {
    const html = renderToString(<WorkflowCard flow={flow} status="ready" />);

    expect(
      html.match(new RegExp(`href="/workflows/${flow.id}"`, "g")),
    ).toHaveLength(2);
    expect(html).not.toContain("aria-disabled");
  });
});
