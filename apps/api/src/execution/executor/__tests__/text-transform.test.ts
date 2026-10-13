
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import type { NodeInput } from "../../collect-node-inputs";
import { executeTextTransform } from "../text-transform";

type WorkflowNode = WorkflowGraph["nodes"][number];

function createNode(
  operation?: "trim" | "uppercase" | "lowercase",
): WorkflowNode {
  return {
    id: "transform-1",
    type: "textTransform",
    position: { x: 0, y: 0 },
    data: { operation },
  };
}

function createInputs(value: unknown): NodeInput[] {
  return [
    {
      sourceNodeId: "text-1",
      sourceHandle: "text",
      targetHandle: "input",
      value,
    },
  ];
}

describe("executeTextTransform", () => {
  it("trims whitespace", () => {
    expect(
      executeTextTransform(
        createNode("trim"),
        createInputs("  Hello  "),
      ),
    ).toEqual({
      status: "completed",
      outputs: { output: "Hello" },
    });
  });

  it("converts text to uppercase", () => {
    expect(
      executeTextTransform(
        createNode("uppercase"),
        createInputs("Hello"),
      ),
    ).toEqual({
      status: "completed",
      outputs: { output: "HELLO" },
    });
  });

  it("converts text to lowercase", () => {
    expect(
      executeTextTransform(
        createNode("lowercase"),
        createInputs("Hello"),
      ),
    ).toEqual({
      status: "completed",
      outputs: { output: "hello" },
    });
  });

  it("fails when operation is missing", () => {
    expect(
      executeTextTransform(
        createNode(),
        createInputs("Hello"),
      ),
    ).toEqual({
      status: "failed",
      error: "Text Transform requires an operation",
    });
  });

  it("fails when input is missing", () => {
    expect(
      executeTextTransform(createNode("trim"), []),
    ).toEqual({
      status: "failed",
      error: "Text Transform requires a string input",
    });
  });

  it("fails when input is not a string", () => {
    expect(
      executeTextTransform(
        createNode("trim"),
        createInputs(123),
      ),
    ).toEqual({
      status: "failed",
      error: "Text Transform requires a string input",
    });
  });

  it("allows an empty string", () => {
    expect(
      executeTextTransform(
        createNode("uppercase"),
        createInputs(""),
      ),
    ).toEqual({
      status: "completed",
      outputs: { output: "" },
    });
  });
});
