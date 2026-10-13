
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import type { NodeInput } from "../../collect-node-inputs";
import { executeTextOutput } from "../text-output";

type WorkflowNode = WorkflowGraph["nodes"][number];

function createNode(): WorkflowNode {
  return {
    id: "output-1",
    type: "textOutput",
    position: { x: 0, y: 0 },
    data: {},
  };
}

function createInputs(value: unknown): NodeInput[] {
  return [
    {
      sourceNodeId: "transform-1",
      sourceHandle: "output",
      targetHandle: "input",
      value,
    },
  ];
}

describe("executeTextOutput", () => {
  it("returns the received text", () => {
    expect(
      executeTextOutput(
        createNode(),
        createInputs("HELLO WORLD"),
      ),
    ).toEqual({
      status: "completed",
      outputs: {
        result: "HELLO WORLD",
      },
    });
  });

  it("allows an empty string", () => {
    expect(
      executeTextOutput(
        createNode(),
        createInputs(""),
      ),
    ).toEqual({
      status: "completed",
      outputs: {
        result: "",
      },
    });
  });

  it("fails when input is missing", () => {
    expect(
      executeTextOutput(createNode(), []),
    ).toEqual({
      status: "failed",
      error: "Text Output requires a string input",
    });
  });

  it("fails when input is not a string", () => {
    expect(
      executeTextOutput(
        createNode(),
        createInputs(123),
      ),
    ).toEqual({
      status: "failed",
      error: "Text Output requires a string input",
    });
  });
});
