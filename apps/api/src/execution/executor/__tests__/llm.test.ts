import { inspect } from "node:util";

import {
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "openai/error";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
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
    vi.restoreAllMocks();
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

  describe("provider diagnostics", () => {
    const PROMPT = "Confidential user prompt";

    let consoleError: MockInstance<typeof console.error>;

    beforeEach(() => {
      // Production mode: logs must contain only allowlisted fields.
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("OPENAI_API_KEY", "sk-test-secret");

      consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
    });

    function loggedText(): string {
      return JSON.stringify(consoleError.mock.calls);
    }

    function providerHeaders(): Headers {
      return new Headers({ "x-request-id": "req_123" });
    }

    it.each([
      [
        "401",
        () =>
          new AuthenticationError(
            401,
            {
              code: "invalid_api_key",
              message: "Incorrect API key provided: sk-test-secret",
            },
            undefined,
            providerHeaders(),
          ),
        {
          name: "AuthenticationError",
          code: "invalid_api_key",
          status: 401,
          requestId: "req_123",
        },
      ],
      [
        "429",
        () =>
          new RateLimitError(
            429,
            {
              code: "insufficient_quota",
              message: `You exceeded your current quota. ${PROMPT}`,
            },
            undefined,
            providerHeaders(),
          ),
        {
          name: "RateLimitError",
          code: "insufficient_quota",
          status: 429,
          requestId: "req_123",
        },
      ],
      [
        "500",
        () =>
          new InternalServerError(
            500,
            { message: "The server had an error" },
            undefined,
            providerHeaders(),
          ),
        {
          name: "InternalServerError",
          status: 500,
          requestId: "req_123",
        },
      ],
    ])(
      "logs safe fields for a %s provider error",
      async (_status, createError, expected) => {
        createResponseMock.mockRejectedValue(createError());

        const result = await executeLlm(
          createNode(),
          [createInput(PROMPT)],
        );

        expect(result).toEqual({
          status: "failed",
          error: "LLM request failed",
        });
        expect(consoleError).toHaveBeenCalledExactlyOnceWith(
          "LLM request failed",
          expected,
        );
        expect(loggedText()).not.toContain("sk-test-secret");
        expect(loggedText()).not.toContain(PROMPT);
        expect(loggedText()).not.toContain("You exceeded");
        expect(loggedText()).not.toContain("server had an error");
      },
    );

    it("sanitizes provider errors in local development", async () => {
      vi.stubEnv("NODE_ENV", "development");

      createResponseMock.mockRejectedValue(
        new AuthenticationError(
          401,
          {
            code: "invalid_api_key",
            message: `Incorrect API key provided: sk-test-secret. ${PROMPT}`,
          },
          undefined,
          new Headers({
            "x-request-id": "req_123",
            "openai-organization": "org-private",
          }),
        ),
      );

      await executeLlm(createNode(), [createInput(PROMPT)]);

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "LLM request failed",
        {
          name: "AuthenticationError",
          code: "invalid_api_key",
          status: 401,
          requestId: "req_123",
        },
      );

      // Rendered as console.error would, including non-enumerable
      // message and stack properties of any Error instance.
      const rendered = inspect(consoleError.mock.calls, {
        depth: null,
        showHidden: true,
      });

      expect(rendered).not.toContain("sk-test-secret");
      expect(rendered).not.toContain(PROMPT);
      expect(rendered).not.toContain("Incorrect API key");
      expect(rendered).not.toContain("org-private");
      expect(rendered).not.toContain("llm.test.ts");
    });

    it("logs missing configuration by variable name only", async () => {
      vi.stubEnv("OPENAI_MODEL", "");

      await executeLlm(createNode(), [createInput(PROMPT)]);

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "LLM provider is not configured",
        { missingVariables: ["OPENAI_MODEL"] },
      );
      expect(loggedText()).not.toContain("sk-test-secret");
    });

    it("logs the response status and reason of an empty response", async () => {
      createResponseMock.mockResolvedValue({
        output_text: "",
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        _request_id: "req_456",
      });

      const result = await executeLlm(
        createNode(),
        [createInput(PROMPT)],
      );

      expect(result).toEqual({
        status: "failed",
        error: "LLM returned an empty response",
      });
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "LLM returned an empty response",
        {
          requestId: "req_456",
          responseStatus: "incomplete",
          incompleteReason: "max_output_tokens",
        },
      );
    });

    it("does not log an expected cancellation", async () => {
      const controller = new AbortController();

      createResponseMock.mockImplementationOnce(() => {
        controller.abort();
        return Promise.reject(new Error("Request was aborted."));
      });

      const result = await executeLlm(
        createNode(),
        [createInput(PROMPT)],
        controller.signal,
      );

      expect(result).toEqual({
        status: "failed",
        error: "LLM request was cancelled",
      });
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
