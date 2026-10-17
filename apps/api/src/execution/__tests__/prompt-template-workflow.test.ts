import type {
  WorkflowExecutionEvent,
  WorkflowGraph,
} from "@flow-studio/shared";
import { describe, expect, it } from "vitest";

import { executeWorkflow } from "../execute-workflow";

function createGraph(template?: string): WorkflowGraph {
  return {
    nodes: [
      {
        id: "input-1",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: "React" },
      },
      {
        id: "prompt-1",
        type: "promptTemplate",
        position: { x: 200, y: 0 },
        data: { template },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 400, y: 0 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        sourceHandle: "text",
        target: "prompt-1",
        targetHandle: "input",
      },
      {
        id: "edge-2",
        source: "prompt-1",
        sourceHandle: "prompt",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  };
}

function createDynamicGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "topic-input",
        type: "textInput",
        position: { x: 0, y: 0 },
        data: { text: "React" },
      },
      {
        id: "language-input",
        type: "textInput",
        position: { x: 0, y: 150 },
        data: { text: "English" },
      },
      {
        id: "audience-input",
        type: "textInput",
        position: { x: 0, y: 300 },
        data: { text: "beginners" },
      },
      {
        id: "prompt-1",
        type: "promptTemplate",
        position: { x: 250, y: 150 },
        data: {
          template:
            "Explain {{topic}} in {{language}} for {{audience}}. Topic: {{topic}}.",
        },
      },
      {
        id: "output-1",
        type: "textOutput",
        position: { x: 500, y: 150 },
        data: {},
      },
    ],
    edges: [
      {
        id: "edge-topic",
        source: "topic-input",
        sourceHandle: "text",
        target: "prompt-1",
        targetHandle: "topic",
      },
      {
        id: "edge-language",
        source: "language-input",
        sourceHandle: "text",
        target: "prompt-1",
        targetHandle: "language",
      },
      {
        id: "edge-audience",
        source: "audience-input",
        sourceHandle: "text",
        target: "prompt-1",
        targetHandle: "audience",
      },
      {
        id: "edge-output",
        source: "prompt-1",
        sourceHandle: "prompt",
        target: "output-1",
        targetHandle: "input",
      },
    ],
  };
}

describe("Prompt Template workflow", () => {
  it("executes Text Input → Prompt Template → Text Output", async () => {
    const result = await executeWorkflow(
      createGraph("Explain {{input}} in simple terms."),
    );

    expect(result.status).toBe("completed");

    expect(result.results["input-1"]).toEqual({
      status: "completed",
      outputs: { text: "React" },
    });

    expect(result.results["prompt-1"]).toEqual({
      status: "completed",
      outputs: {
        prompt: "Explain React in simple terms.",
      },
    });

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: {
        result: "Explain React in simple terms.",
      },
    });
  });

  it("emits SSE events with the generated prompt", async () => {
    const events: WorkflowExecutionEvent[] = [];

    const result = await executeWorkflow(
      createGraph("Explain {{input}}"),
      (event) => events.push(event),
    );

    expect(result.status).toBe("completed");

    expect(events).toEqual([
      { type: "flow:start" },
      { type: "node:start", nodeId: "input-1" },
      {
        type: "node:stop",
        nodeId: "input-1",
        status: "completed",
        outputs: { text: "React" },
      },
      { type: "node:start", nodeId: "prompt-1" },
      {
        type: "node:stop",
        nodeId: "prompt-1",
        status: "completed",
        outputs: { prompt: "Explain React" },
      },
      { type: "node:start", nodeId: "output-1" },
      {
        type: "node:stop",
        nodeId: "output-1",
        status: "completed",
        outputs: { result: "Explain React" },
      },
      { type: "flow:stop", status: "completed" },
    ]);
  });

  it("fails when a required input is unavailable", async () => {
    const graph = createGraph("Explain {{input}}");

    graph.edges = graph.edges.filter(
      (edge) => edge.id !== "edge-1",
    );

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("failed");
    expect(result.results["prompt-1"]?.status).toBe("failed");
    expect(result.results["output-1"]?.status).toBe("skipped");
  });

  it("executes a workflow with multiple dynamic variables", async () => {
    const graph = createDynamicGraph();

    const result = await executeWorkflow(graph);

    const expectedPrompt =
      "Explain React in English for beginners. Topic: React.";

    expect(result.status).toBe("completed");

    expect(result.results["topic-input"]).toEqual({
      status: "completed",
      outputs: { text: "React" },
    });

    expect(result.results["language-input"]).toEqual({
      status: "completed",
      outputs: { text: "English" },
    });

    expect(result.results["audience-input"]).toEqual({
      status: "completed",
      outputs: { text: "beginners" },
    });

    expect(result.results["prompt-1"]).toEqual({
      status: "completed",
      outputs: { prompt: expectedPrompt },
    });

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: { result: expectedPrompt },
    });
  });

  it("fails when a dynamic variable is not connected", async () => {
    const graph = createDynamicGraph();

    graph.edges = graph.edges.filter(
      (edge) => edge.id !== "edge-language",
    );

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("failed");

    expect(result.results["prompt-1"]).toEqual({
      status: "failed",
      error:
        'Prompt Template requires a string input for "language"',
    });

    expect(result.results["output-1"]?.status).toBe("skipped");
  });
});


describe("stable Prompt Template port workflow", () => {
  it("runs end-to-end after a variable is renamed", async () => {
    const graph = createGraph("Explain {{first}}");

    const prompt = graph.nodes.find(
      (node) => node.id === "prompt-1",
    );

    if (!prompt || prompt.type !== "promptTemplate") {
      throw new Error("Prompt node missing");
    }

    prompt.data.inputs = [
      { id: "input-1", name: "first" },
    ];

    graph.edges[0]!.targetHandle = "input-1";

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("completed");

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: { result: "Explain React" },
    });
  });
});

describe("inactive Prompt Template ports", () => {
  function createInactivePortGraph(): WorkflowGraph {
    const graph = createDynamicGraph();

    const prompt = graph.nodes.find(
      (node) => node.id === "prompt-1",
    );

    if (!prompt || prompt.type !== "promptTemplate") {
      throw new Error("Prompt node missing");
    }

    // {{audience}} was removed from the template while still connected.
    prompt.data = {
      template: "Explain {{topic}} in {{language}}.",
      inputs: [
        { id: "port-topic", name: "topic" },
        { id: "port-language", name: "language" },
        { id: "port-audience", name: "audience" },
      ],
    };

    for (const edge of graph.edges) {
      if (edge.target === "prompt-1") {
        edge.targetHandle = `port-${edge.targetHandle}`;
      }
    }

    return graph;
  }

  it("ignores edges into inactive ports", async () => {
    const result = await executeWorkflow(createInactivePortGraph());

    expect(result.status).toBe("completed");
    expect(result.results["audience-input"]).toBeUndefined();

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: { result: "Explain React in English." },
    });
  });

  it("uses the original connection when the variable is restored", async () => {
    const graph = createInactivePortGraph();

    const prompt = graph.nodes.find(
      (node) => node.id === "prompt-1",
    );

    if (!prompt || prompt.type !== "promptTemplate") {
      throw new Error("Prompt node missing");
    }

    prompt.data.template = "Explain {{topic}} for {{audience}}.";

    const result = await executeWorkflow(graph);

    expect(result.status).toBe("completed");
    expect(result.results["language-input"]).toBeUndefined();

    expect(result.results["output-1"]).toEqual({
      status: "completed",
      outputs: { result: "Explain React for beginners." },
    });
  });

  it("cannot run a graph connected only through an inactive port", async () => {
    const result = await executeWorkflow({
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 0, y: 0 },
          data: { text: "React" },
        },
        {
          id: "prompt-1",
          type: "promptTemplate",
          position: { x: 200, y: 0 },
          data: {
            template: "Static prompt",
            inputs: [{ id: "port-topic", name: "topic" }],
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          sourceHandle: "text",
          target: "prompt-1",
          targetHandle: "port-topic",
        },
      ],
    });

    expect(result).toEqual({
      status: "failed",
      results: {},
      error: "Workflow has no connected nodes to execute",
    });
  });
});
