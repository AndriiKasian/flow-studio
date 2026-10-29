import OpenAI from "openai";

import type { WorkflowGraph } from "@flow-studio/shared";

import {
  logFailure,
  logProviderError,
} from "../../lib/error-diagnostics";
import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

const MAX_INPUT_LENGTH = 12_000;
const MAX_OUTPUT_TOKENS = 500;
const REQUEST_TIMEOUT_MS = 20_000;

export async function executeLlm(
  node: WorkflowNode,
  inputs: NodeInput[],
  signal?: AbortSignal,
): Promise<NodeExecutionResult> {
  if (node.type !== "llm") {
    return {
      status: "failed",
      error: `Expected llm node, received "${node.type}"`,
    };
  }

  const input = inputs.find(
    (item) => item.targetHandle === "prompt",
  );

  if (
    !input ||
    typeof input.value !== "string" ||
    !input.value.trim()
  ) {
    return {
      status: "failed",
      error: "LLM requires a non-empty prompt input",
    };
  }

  if (input.value.length > MAX_INPUT_LENGTH) {
    return {
      status: "failed",
      error: "LLM prompt exceeds the maximum allowed length",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    logFailure("LLM provider is not configured", {
      missingVariables: [
        ...(apiKey ? [] : ["OPENAI_API_KEY"]),
        ...(model ? [] : ["OPENAI_MODEL"]),
      ],
    });

    return {
      status: "failed",
      error: "LLM provider is not configured",
    };
  }

  if (signal?.aborted) {
    return {
      status: "failed",
      error: "LLM request was cancelled",
    };
  }

  const client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  try {
    const request = {
      model,
      instructions:
        node.data.systemPrompt ||
        "Provide a concise and helpful response.",
      input: input.value,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    };

    const response = signal
      ? await client.responses.create(request, { signal })
      : await client.responses.create(request);

    const output = response.output_text?.trim();

    if (!output) {
      logFailure("LLM returned an empty response", {
        requestId: response._request_id ?? undefined,
        responseStatus: response.status,
        incompleteReason: response.incomplete_details?.reason,
      });

      return {
        status: "failed",
        error: "LLM returned an empty response",
      };
    }

    return {
      status: "completed",
      outputs: {
        response: output,
      },
    };
  } catch (error) {
    if (signal?.aborted) {
      return {
        status: "failed",
        error: "LLM request was cancelled",
      };
    }

    logProviderError("LLM request failed", error);

    return {
      status: "failed",
      error: "LLM request failed",
    };
  }
}
