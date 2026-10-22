import type { WorkflowGraph } from "@flow-studio/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { executeNode } from "../execute-node";

type WorkflowNode = WorkflowGraph["nodes"][number];

// Bypasses the shared schema's text length limit to produce an oversized output.
const oversizedTextInput: WorkflowNode = {
  id: "input",
  type: "textInput",
  position: { x: 0, y: 0 },
  data: { text: "x".repeat(25_000) },
};

describe("executeNode output size limit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["unset", undefined],
    ["misconfigured", "prod"],
    ["development", "development"],
  ])(
    "rejects oversized outputs when NODE_ENV is %s",
    async (_label, nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);

      await expect(executeNode(oversizedTextInput, [])).resolves.toEqual({
        status: "failed",
        error: "Node output exceeds the maximum allowed size",
      });
    },
  );
});
