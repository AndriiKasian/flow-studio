
import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import { executeTextInput } from "../text-input";

type WorkflowNode = WorkflowGraph["nodes"][number];

function createTextInputNode(text: string): WorkflowNode {
  return {
    id: "text-input-1",
    type: "textInput",
    position: { x: 0, y: 0 },
    data: { text },
  };
}

describe("executeTextInput", () => {
  it("returns the configured text", () => {
    const node = createTextInputNode("Hello world");

    expect(executeTextInput(node)).toEqual({
      status: "completed",
      outputs: {
        text: "Hello world",
      },
    });
  });

  it("rejects an empty string", () => {
    const node = createTextInputNode("");
  
    expect(executeTextInput(node)).toEqual({
      status: "failed",
      error: "Text Input node requires non-empty text",
    });
  });

  it("rejects whitespace-only text", () => {
    const node = createTextInputNode("   ");
  
    expect(executeTextInput(node)).toEqual({
      status: "failed",
      error: "Text Input node requires non-empty text",
    });
  });

  it("rejects a node with the wrong type", () => {
    const node: WorkflowNode = {
      id: "output-1",
      type: "textOutput",
      position: { x: 0, y: 0 },
      data: {},
    };

    expect(executeTextInput(node)).toEqual({
      status: "failed",
      error: 'Expected textInput node, received "textOutput"',
    });
  });

  it("rejects missing text", () => {
    const node: WorkflowNode = {
      id: "text-input-1",
      type: "textInput",
      position: { x: 0, y: 0 },
      data: {},
    };

    expect(executeTextInput(node)).toEqual({
      status: "failed",
      error: "Text Input node requires a string in data.text",
    });
  });
});
