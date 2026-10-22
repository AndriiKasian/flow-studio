import {
  WORKFLOW_HANDLES,
  extractPromptVariables,
  workflowGraphSchema,
} from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import { createDemoWorkflow } from "../demo-workflow";

describe("createDemoWorkflow", () => {
  it("creates a valid workflow graph", () => {
    const graph = createDemoWorkflow();

    expect(() => workflowGraphSchema.parse(graph)).not.toThrow();
  });

  it("contains exactly six expected nodes", () => {
    const graph = createDemoWorkflow();

    expect(graph.nodes).toHaveLength(6);

    expect(graph.nodes.map((node) => node.type)).toEqual([
      "textInput",
      "webSearch",
      "promptTemplate",
      "llm",
      "textOutput",
      "jsonOutput",
    ]);
  });

  it("contains exactly six expected connections", () => {
    const graph = createDemoWorkflow();

    expect(graph.edges).toHaveLength(6);

    expect(
      graph.edges.map((edge) => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
      })),
    ).toEqual([
      {
        source: "demo-text-input",
        sourceHandle: "text",
        target: "demo-web-search",
        targetHandle: "query",
      },
      {
        source: "demo-text-input",
        sourceHandle: "text",
        target: "demo-prompt-template",
        targetHandle: "topic",
      },
      {
        source: "demo-web-search",
        sourceHandle: "results",
        target: "demo-prompt-template",
        targetHandle: "results",
      },
      {
        source: "demo-prompt-template",
        sourceHandle: "prompt",
        target: "demo-llm",
        targetHandle: "prompt",
      },
      {
        source: "demo-llm",
        sourceHandle: "response",
        target: "demo-text-output",
        targetHandle: "input",
      },
      {
        source: "demo-llm",
        sourceHandle: "response",
        target: "demo-json-output",
        targetHandle: "input",
      },
    ]);
  });

  it("uses valid handles for every connection", () => {
    const graph = createDemoWorkflow();

    for (const edge of graph.edges) {
      const source = graph.nodes.find(
        (node) => node.id === edge.source,
      );

      const target = graph.nodes.find(
        (node) => node.id === edge.target,
      );

      expect(source).toBeDefined();
      expect(target).toBeDefined();

      if (!source || !target) {
        continue;
      }

      expect(
        WORKFLOW_HANDLES[source.type].outputs,
      ).toContain(edge.sourceHandle);

      if (target.type === "promptTemplate") {
        const variables = extractPromptVariables(
          target.data.template ?? "",
        );

        expect(variables).toContain(edge.targetHandle);
      } else {
        expect(
          WORKFLOW_HANDLES[target.type].inputs,
        ).toContain(edge.targetHandle);
      }
    }
  });

  it("uses a fixed search query and prompt", () => {
    const graph = createDemoWorkflow();

    const input = graph.nodes.find(
      (node) => node.id === "demo-text-input",
    );

    const prompt = graph.nodes.find(
      (node) => node.id === "demo-prompt-template",
    );

    expect(input?.type).toBe("textInput");
    expect(prompt?.type).toBe("promptTemplate");

    if (input?.type === "textInput") {
      expect(input.data.text).toBe("React 19 new features");
    }

    if (prompt?.type === "promptTemplate") {
      expect(prompt.data.template).toContain("{{results}}");
    }
  });

  it("returns independent graph instances", () => {
    const first = createDemoWorkflow();
    const second = createDemoWorkflow();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.nodes).not.toBe(second.nodes);
    expect(first.edges).not.toBe(second.edges);
  });
});
