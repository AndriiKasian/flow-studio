import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "@flow-studio/shared";

import { executePromptTemplate } from "../prompt-template";
import type { NodeInput } from "../../collect-node-inputs";

type WorkflowNode = WorkflowGraph["nodes"][number];

function createNode(template?: string): WorkflowNode {
  return {
    id: "prompt-1",
    type: "promptTemplate",
    position: { x: 0, y: 0 },
    data: { template },
  };
}

function createInput(
  value: unknown,
  targetHandle = "input",
): NodeInput {
  return {
    sourceNodeId: `source-${targetHandle}`,
    sourceHandle: "output",
    targetHandle,
    value,
  };
}

describe("executePromptTemplate", () => {
  it("replaces {{input}} with the incoming text", () => {
    const result = executePromptTemplate(
      createNode("Explain {{input}}"),
      [createInput("React")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: "Explain React" },
    });
  });

  it("replaces multiple occurrences of {{input}}", () => {
    const result = executePromptTemplate(
      createNode("Compare {{input}} with {{input}}"),
      [createInput("Angular")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: "Compare Angular with Angular" },
    });
  });

  it("replaces multiple named variables", () => {
    const result = executePromptTemplate(
      createNode("Explain {{topic}} in {{language}}"),
      [
        createInput("English", "language"),
        createInput("React", "topic"),
      ],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: "Explain React in English" },
    });
  });

  it("reuses the same named variable multiple times", () => {
    const result = executePromptTemplate(
      createNode("Compare {{topic}} with {{topic}}"),
      [createInput("Angular", "topic")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: "Compare Angular with Angular" },
    });
  });

  it("preserves special replacement characters literally", () => {
    const value = "$& $$ $' $`";

    const result = executePromptTemplate(
      createNode("Value: {{topic}}"),
      [createInput(value, "topic")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: `Value: ${value}` },
    });
  });

  it("supports a static template without an input", () => {
    const result = executePromptTemplate(
      createNode("Write a short introduction"),
      [],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: { prompt: "Write a short introduction" },
    });
  });

  it("fails when the template is missing", () => {
    const result = executePromptTemplate(createNode(), []);

    expect(result).toEqual({
      status: "failed",
      error: "Prompt Template requires a non-empty template",
    });
  });

  it("fails when the template contains only whitespace", () => {
    const result = executePromptTemplate(
      createNode("   "),
      [],
    );

    expect(result.status).toBe("failed");
  });

  it("fails when a required input is missing", () => {
    const result = executePromptTemplate(
      createNode("Explain {{input}}"),
      [],
    );

    expect(result).toEqual({
      status: "failed",
      error: 'Prompt Template requires a string input for "input"',
    });
  });

  it("fails when a named variable is missing", () => {
    const result = executePromptTemplate(
      createNode("Explain {{topic}} in {{language}}"),
      [createInput("React", "topic")],
    );

    expect(result).toEqual({
      status: "failed",
      error: 'Prompt Template requires a string input for "language"',
    });
  });

  it("fails when the input is not a string", () => {
    const result = executePromptTemplate(
      createNode("Explain {{input}}"),
      [createInput(123)],
    );

    expect(result).toEqual({
      status: "failed",
      error: 'Prompt Template requires a string input for "input"',
    });
  });

  it("fails when a named variable is not a string", () => {
    const result = executePromptTemplate(
      createNode("Explain {{topic}}"),
      [createInput(123, "topic")],
    );

    expect(result).toEqual({
      status: "failed",
      error: 'Prompt Template requires a string input for "topic"',
    });
  });
});


describe("stable Prompt Template port IDs", () => {
  it("executes a renamed variable through its original port ID", () => {
    const node: WorkflowNode = {
      id: "prompt-1",
      type: "promptTemplate",
      position: { x: 0, y: 0 },
      data: {
        template: "Explain {{first}}",
        inputs: [{ id: "input-1", name: "first" }],
      },
    };

    expect(
      executePromptTemplate(node, [
        createInput("React", "input-1"),
      ]),
    ).toEqual({
      status: "completed",
      outputs: { prompt: "Explain React" },
    });
  });
});
