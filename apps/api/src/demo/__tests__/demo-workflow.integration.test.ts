
import type { WorkflowExecutionEvent } from "@flow-studio/shared";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { executeWorkflow } from "../../execution/execute-workflow";
import { createDemoWorkflow } from "../demo-workflow";

interface OpenAIRequest {
  model: string;
  instructions: string;
  input: string;
  max_output_tokens: number;
}

interface OpenAIResponse {
  output_text: string;
}

const { createResponseMock, fetchMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn<
    (request: OpenAIRequest) => Promise<OpenAIResponse>
  >(),
  fetchMock: vi.fn<typeof fetch>(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: createResponseMock,
    };
  },
}));

const SEARCH_RESULTS = [
  {
    title: "React 19",
    link: "https://react.dev/blog/2024/12/05/react-19",
    snippet: "React 19 introduces Actions and new APIs.",
  },
];

const LLM_RESPONSE =
  "React 19 introduces Actions and new APIs.";

const EXPECTED_NODE_IDS = [
  "demo-text-input",
  "demo-web-search",
  "demo-prompt-template",
  "demo-llm",
  "demo-text-output",
  "demo-json-output",
];

describe("Demo workflow integration", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubEnv("SERPER_API_KEY", "test-serper-key");

    createResponseMock.mockReset();
    fetchMock.mockReset();

    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          organic: SEARCH_RESULTS,
        }),
    } as Response);

    createResponseMock.mockResolvedValue({
      output_text: LLM_RESPONSE,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("executes all six nodes and produces both outputs", async () => {
    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createDemoWorkflow(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("completed");
    expect(Object.keys(result.results)).toHaveLength(6);

    for (const nodeId of EXPECTED_NODE_IDS) {
      expect(result.results[nodeId]?.status).toBe(
        "completed",
      );
    }

    expect(result.results["demo-text-output"]).toEqual({
      status: "completed",
      outputs: {
        result: LLM_RESPONSE,
      },
    });

    expect(result.results["demo-json-output"]).toEqual({
      status: "completed",
      outputs: {
        result: {
          result: LLM_RESPONSE,
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(createResponseMock).toHaveBeenCalledOnce();

    expect(events[0]).toEqual({
      type: "flow:start",
    });

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "completed",
    });
  });

  it("passes the search results into the LLM prompt", async () => {
    await executeWorkflow(createDemoWorkflow());

    expect(fetchMock).toHaveBeenCalledOnce();

    const fetchCall = fetchMock.mock.calls[0];

    expect(fetchCall).toBeDefined();

    if (!fetchCall) {
      throw new Error("Expected a Web Search request");
    }

    const [url, options] = fetchCall;

    expect(url).toBe(
      "https://google.serper.dev/search",
    );

    expect(options?.method).toBe("POST");

    const headers = new Headers(options?.headers);

    expect(headers.get("X-API-KEY")).toBe(
      "test-serper-key",
    );

    expect(createResponseMock).toHaveBeenCalledOnce();

    const llmCall = createResponseMock.mock.calls[0];

    expect(llmCall).toBeDefined();

    if (!llmCall) {
      throw new Error("Expected an OpenAI request");
    }

    const [request] = llmCall;

    expect(request.model).toBe("test-model");
    expect(request.max_output_tokens).toBe(500);

    expect(request.input).toContain(
      "React 19 introduces Actions and new APIs.",
    );

    expect(request.input).toContain(
      "https://react.dev/blog/2024/12/05/react-19",
    );

    expect(request.input).not.toContain("{{results}}");
  });

  it("emits start and stop events for every node", async () => {
    const events: WorkflowExecutionEvent[] = [];

    await executeWorkflow(
      createDemoWorkflow(),
      (event) => events.push(event),
    );

    const startedNodeIds = events
      .filter((event) => event.type === "node:start")
      .map((event) => event.nodeId);

    const stoppedNodeIds = events
      .filter((event) => event.type === "node:stop")
      .map((event) => event.nodeId);

    expect(startedNodeIds).toEqual(EXPECTED_NODE_IDS);
    expect(stoppedNodeIds).toEqual(EXPECTED_NODE_IDS);

    for (const event of events) {
      if (event.type === "node:stop") {
        expect(event.status).toBe("completed");
      }
    }

    expect(events).toHaveLength(14);
  });

  it("stops the workflow if Web Search fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createDemoWorkflow(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("failed");

    expect(result.results["demo-web-search"]?.status).toBe(
      "failed",
    );

    expect(result.results["demo-llm"]?.status).toBe(
      "skipped",
    );

    expect(createResponseMock).not.toHaveBeenCalled();

    const lastEvent = events.at(-1);

    expect(lastEvent?.type).toBe("flow:stop");

    if (lastEvent?.type === "flow:stop") {
      expect(lastEvent.status).toBe("failed");
    }
  });
});
