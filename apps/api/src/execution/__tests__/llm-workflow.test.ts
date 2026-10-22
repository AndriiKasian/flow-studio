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
        data: { text: "React" },
      },
      {
        id: "prompt-1",
        type: "promptTemplate",
        position: { x: 200, y: 0 },
        data: {
          template: "Explain {{input}} simply.",
        },
      },
      {
        id: "llm-1",
        type: "llm",
        position: { x: 400, y: 0 },
        data: {
          systemPrompt: "You are a helpful assistant",
        },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 600, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        sourceHandle: "text",
        target: "prompt-1",
        targetHandle: "input",
      },
      {
        id: "edge-2",
        source: "prompt-1",
        sourceHandle: "prompt",
        target: "llm-1",
        targetHandle: "prompt",
      },
      {
        id: "edge-3",
        source: "llm-1",
        sourceHandle: "response",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  };
}

describe("LLM workflow", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");

    createResponseMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("executes the complete workflow", async () => {
    createResponseMock.mockResolvedValue({
      output_text: "React is a UI library.",
    });

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("completed");

    expect(result.results["prompt-1"]).toEqual({
      status: "completed",
      outputs: {
        prompt: "Explain React simply.",
      },
    });

    expect(result.results["llm-1"]).toEqual({
      status: "completed",
      outputs: {
        response: "React is a UI library.",
      },
    });

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: {
        result: "React is a UI library.",
      },
    });

    expect(createResponseMock).toHaveBeenCalledOnce();

    expect(createResponseMock).toHaveBeenCalledWith({
      model: "test-model",
      instructions: "You are a helpful assistant",
      input: "Explain React simply.",
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
      "node:start",
      "node:stop",
      "flow:stop",
    ]);

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "completed",
    });
  });

  it("stops the workflow when LLM fails", async () => {
    createResponseMock.mockRejectedValue(
      new Error("Sensitive provider error"),
    );

    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph(),
      (event) => events.push(event),
    );

    expect(result.status).toBe("failed");

    expect(result.results["llm-1"]).toEqual({
      status: "failed",
      error: "LLM request failed",
    });

    expect(result.results["output-1"]).toEqual({
      status: "skipped",
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "llm-1",
      status: "failed",
      error: "LLM request failed",
    });

    expect(events).toContainEqual({
      type: "node:stop",
      nodeId: "output-1",
      status: "skipped",
    });

    expect(events.at(-1)).toEqual({
      type: "flow:stop",
      status: "failed",
      error: 'Node "llm-1" failed: LLM request failed',
    });

    expect(JSON.stringify(result)).not.toContain(
      "Sensitive provider error",
    );
  });
});
