import type { WorkflowGraph } from "@flow-studio/shared";

import {
  logFailure,
  logProviderError,
} from "../../lib/error-diagnostics";
import type { NodeInput } from "../collect-node-inputs";
import type { NodeExecutionResult } from "../types";

type WorkflowNode = WorkflowGraph["nodes"][number];

const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;

export async function executeWebSearch(
  node: WorkflowNode,
  inputs: NodeInput[],
  signal?: AbortSignal,
): Promise<NodeExecutionResult> {
  if (node.type !== "webSearch") {
    return {
      status: "failed",
      error: `Expected webSearch node, received "${node.type}"`,
    };
  }

  const input = inputs.find(
    (item) => item.targetHandle === "query",
  );

  if (
    !input ||
    typeof input.value !== "string" ||
    !input.value.trim()
  ) {
    return {
      status: "failed",
      error: "Web Search requires a non-empty query",
    };
  }

  const query = input.value.trim();

  if (query.length > MAX_QUERY_LENGTH) {
    return {
      status: "failed",
      error: "Web Search query exceeds the maximum allowed length",
    };
  }

  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    logFailure("Web Search provider is not configured", {
      missingVariables: ["SERPER_API_KEY"],
    });

    return {
      status: "failed",
      error: "Web Search provider is not configured",
    };
  }

  if (signal?.aborted) {
    return {
      status: "failed",
      error: "Web Search request was cancelled",
    };
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: MAX_RESULTS,
      }),
      signal: requestSignal,
    });

    if (!response.ok) {
      logFailure("Web Search request failed", {
        status: response.status,
      });

      return {
        status: "failed",
        error: "Web Search request failed",
      };
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !("organic" in data) ||
      !Array.isArray(data.organic)
    ) {
      logFailure("Web Search returned an invalid response", {});

      return {
        status: "failed",
        error: "Web Search returned an invalid response",
      };
    }

    const organic: unknown[] = data.organic;

    const results = organic
      .slice(0, MAX_RESULTS)
      .filter(
        (
          item,
        ): item is {
          title: string;
          link: string;
          snippet?: string;
        } => {
          if (typeof item !== "object" || item === null) {
            return false;
          }

          return (
            "title" in item &&
            typeof item.title === "string" &&
            "link" in item &&
            typeof item.link === "string" &&
            /^https?:\/\//i.test(item.link)
          );
        },
      )
      .map((item) => ({
        title: item.title,
        url: item.link,
        snippet:
          "snippet" in item && typeof item.snippet === "string"
            ? item.snippet
            : "",
      }));

    return {
      status: "completed",
      outputs: {
        results: JSON.stringify(results),
      },
    };
  } catch (error) {
    if (requestSignal.aborted && signal?.aborted) {
      return {
        status: "failed",
        error: "Web Search request was cancelled",
      };
    }

    logProviderError("Web Search request failed", error);

    return {
      status: "failed",
      error: "Web Search request failed",
    };
  }
}
