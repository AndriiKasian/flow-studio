
import type { WorkflowGraph } from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import type { NodeInput } from "../../collect-node-inputs";
import { executeJsonOutput } from "../json-output";

type WorkflowNode = WorkflowGraph["nodes"][number];

function createNode(): WorkflowNode {
  return {
    id: "json-output-1",
    type: "jsonOutput",
    position: { x: 0, y: 0 },
    data: {},
  };
}

function createInput(value: unknown): NodeInput {
  return {
    sourceNodeId: "llm-1",
    sourceHandle: "response",
    targetHandle: "input",
    value,
  };
}

describe("executeJsonOutput", () => {
  it("parses a valid JSON object", () => {
    const result = executeJsonOutput(
      createNode(),
      [
        createInput(
          '{"technology":"React","category":"UI library"}',
        ),
      ],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        result: {
          technology: "React",
          category: "UI library",
        },
      },
    });
  });

  it("supports nested JSON objects and arrays", () => {
    const result = executeJsonOutput(
      createNode(),
      [
        createInput(
          '{"name":"React","tags":["frontend","javascript"],"details":{"version":19}}',
        ),
      ],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        result: {
          name: "React",
          tags: ["frontend", "javascript"],
          details: {
            version: 19,
          },
        },
      },
    });
  });

  it("wraps plain text into a JSON object", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput("React is a UI library.")],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        result: {
          result: "React is a UI library.",
        },
      },
    });
  });

  it("wraps a JSON array into a result object", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput('["React","Angular"]')],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        result: {
          result: ["React", "Angular"],
        },
      },
    });
  });

  it("wraps invalid JSON syntax as plain text", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput('{"name":React}')],
    );

    expect(result).toEqual({
      status: "completed",
      outputs: {
        result: {
          result: '{"name":React}',
        },
      },
    });
  });

  it("rejects missing input", () => {
    const result = executeJsonOutput(createNode(), []);

    expect(result).toEqual({
      status: "failed",
      error: "JSON Output requires a string input",
    });
  });

  it("rejects non-string input", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput({ name: "React" })],
    );

    expect(result).toEqual({
      status: "failed",
      error: "JSON Output requires a string input",
    });
  });

  it("rejects empty input", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput("   ")],
    );

    expect(result).toEqual({
      status: "failed",
      error: "JSON Output requires a non-empty input",
    });
  });

  it("rejects input exceeding the length limit", () => {
    const result = executeJsonOutput(
      createNode(),
      [createInput("a".repeat(20_001))],
    );

    expect(result).toEqual({
      status: "failed",
      error: "JSON Output exceeds the maximum allowed length",
    });
  });

  it("rejects an incorrect node type", () => {
    const node: WorkflowNode = {
      id: "text-output-1",
      type: "textOutput",
      position: { x: 0, y: 0 },
      data: {},
    };

    const result = executeJsonOutput(
      node,
      [createInput('{"name":"React"}')],
    );

    expect(result).toEqual({
      status: "failed",
      error: 'Expected jsonOutput node, received "textOutput"',
    });
  });
});
