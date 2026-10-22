import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { executeWorkflow } from "../execute-workflow";

const { createResponseMock } = vi.hoisted(() => ({
  createResponseMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: createResponseMock,
    };
  },
}));

function createGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "input-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: {
          text: "Describe React",
        },
      },
      {
        id: "llm-1",
        type: "llm",
        position: { x: 200, y: 0 },
        data: {
          systemPrompt: "Provide a concise response.",
        },
      },
      {
        id: "json-1",
        type: "jsonOutput",
        position: { x: 400, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        sourceHandle: "text",
        target: "llm-1",
        targetHandle: "prompt",
      },
      {
        id: "edge-2",
        source: "llm-1",
        sourceHandle: "response",
        target: "json-1",
        targetHandle: "input",
      },
    ],
  };
}

describe("LLM → JSON Output workflow", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    createResponseMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses a JSON object returned by LLM", async () => {
    createResponseMock.mockResolvedValue({
      output_text:
        '{"technology":"React","category":"UI library"}',
    });

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("completed");

    expect(result.results["llm-1"]).toEqual({
      status: "completed",
      outputs: {
        response:
          '{"technology":"React","category":"UI library"}',
      },
    });

    expect(result.results["json-1"]).toEqual({
      status: "completed",
      outputs: {
        result: {
          technology: "React",
          category: "UI library",
        },
      },
    });

    expect(createResponseMock).toHaveBeenCalledOnce();

    expect(createResponseMock).toHaveBeenCalledWith({
      model: "test-model",
      instructions: "Provide a concise response.",
      input: "Describe React",
      max_output_tokens: 500,
    });

    expect(events.map((event) => event.type)).toEqual([
      "flow:start",
      "node:start",
      "node:stop",
      "node:start",
      "node:stop",
      "node:start",
      "node:stop",
      "flow:stop",
    ]);

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "completed",
    });
  });

  it("converts plain LLM text into a JSON object", async () => {
    createResponseMock.mockResolvedValue({
      output_text: "React is a UI library.",
    });

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("completed");

    expect(result.results["llm-1"]).toEqual({
      status: "completed",
      outputs: {
        response: "React is a UI library.",
      },
    });

    expect(result.results["json-1"]).toEqual({
      status: "completed",
      outputs: {
        result: {
          result: "React is a UI library.",
        },
      },
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "json-1",
      status: "completed",
      outputs: {
        result: {
          result: "React is a UI library.",
        },
      },
    });

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "completed",
    });
  });
});
