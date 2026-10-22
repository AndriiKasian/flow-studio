import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import type { NodeInput } from "../../collect-node-inputs";
import { executeLlm } from "../llm";

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

type WorkflowNode = WorkflowGraph["nodes"][number];

function createNode(): WorkflowNode {
  return {
    id: "llm-1",
    type: "llm",
    position: { x: 0, y: 0 },
    data: {
      systemPrompt: "You are a helpful assistant",
    },
  };
}

function createInput(value: unknown): NodeInput {
  return {
    sourceNodeId: "prompt-1",
    sourceHandle: "prompt",
    targetHandle: "prompt",
    value,
  };
}

describe("executeLlm", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");

    createResponseMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the LLM response", async () => {
    createResponseMock.mockResolvedValue({
      output_text: "Hello from OpenAI",
    });

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        response: "Hello from OpenAI",
      },
    });

    expect(createResponseMock).toHaveBeenCalledWith({
      model: "test-model",
      instructions: "You are a helpful assistant",
      input: "Hello",
      max_output_tokens: 500,
    });
  });

  it("passes AbortSignal to the OpenAI SDK", async () => {
    createResponseMock.mockResolvedValue({
      output_text: "Hello from OpenAI",
    });

    const controller = new AbortController();

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
      controller.signal,
    );

    expect(result.status).toBe("completed");

    expect(createResponseMock).toHaveBeenCalledExactlyOnceWith(
      {
        model: "test-model",
        instructions: "You are a helpful assistant",
        input: "Hello",
        max_output_tokens: 500,
      },
      {
        signal: controller.signal,
      },
    );
  });

  it("does not call OpenAI when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
      controller.signal,
    );

    expect(result).toEqual({
      status: "failed",
      error: "LLM request was cancelled",
    });

    expect(createResponseMock).not.toHaveBeenCalled();
  });

  it("handles cancellation during an OpenAI request", async () => {
    const controller = new AbortController();

    createResponseMock.mockImplementationOnce(
      async (_request: unknown, options: { signal?: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => {
              reject(new Error("Request aborted"));
            },
            { once: true },
          );
        });
      },
    );

    const execution = executeLlm(
      createNode(),
      [createInput("Hello")],
      controller.signal,
    );

    controller.abort();

    const result = await execution;

    expect(result).toEqual({
      status: "failed",
      error: "LLM request was cancelled",
    });
  });

  it("rejects a missing prompt", async () => {
    const result = await executeLlm(createNode(), []);

    expect(result).toEqual({
      status: "failed",
      error: "LLM requires a non-empty prompt input",
    });

    expect(createResponseMock).not.toHaveBeenCalled();
  });

  it("rejects a prompt exceeding the length limit", async () => {
    const result = await executeLlm(
      createNode(),
      [createInput("a".repeat(12_001))],
    );

    expect(result).toEqual({
      status: "failed",
      error: "LLM prompt exceeds the maximum allowed length",
    });

    expect(createResponseMock).not.toHaveBeenCalled();
  });

  it("rejects missing provider configuration", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "LLM provider is not configured",
    });

    expect(createResponseMock).not.toHaveBeenCalled();
  });

  it("rejects an empty LLM response", async () => {
    createResponseMock.mockResolvedValue({
      output_text: "   ",
    });

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "LLM returned an empty response",
    });
  });

  it("handles OpenAI API errors safely", async () => {
    createResponseMock.mockRejectedValue(
      new Error("Sensitive provider error"),
    );

    const result = await executeLlm(
      createNode(),
      [createInput("Hello")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "LLM request failed",
    });
  });
});
