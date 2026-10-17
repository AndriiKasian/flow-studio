import { describe, expect, it } from "vitest";

import { importWorkflowFromFile } from "../workflow-file";

function createJsonFile(content: unknown): File {
  return new File(
    [JSON.stringify(content)],
    "workflow.json",
    { type: "application/json" },
  );
}

describe("importWorkflowFromFile", () => {
  it("imports a legacy graph and removes Text Output results", async () => {
    const legacyGraph = {
      nodes: [
        {
          id: "input-1",
          type: "textInput",
          position: { x: 100, y: 200 },
          data: { text: "Hello world" },
        },
        {
          id: "output-1",
          type: "textOutput",
          position: { x: 400, y: 200 },
          data: { result: "Previous execution result" },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          target: "output-1",
          sourceHandle: "text",
          targetHandle: "input",
          type: "workflow",
        },
      ],
    };

    const result = await importWorkflowFromFile(
      createJsonFile(legacyGraph),
    );

    expect(result).toEqual({
      ...legacyGraph,
      nodes: [
        legacyGraph.nodes[0],
        {
          ...legacyGraph.nodes[1],
          data: {},
        },
      ],
    });
  });

  it("rejects an invalid workflow structure", async () => {
    const file = createJsonFile({
      nodes: "invalid",
      edges: [],
    });

    await expect(
      importWorkflowFromFile(file),
    ).rejects.toThrow("Invalid workflow file structure.");
  });

  it("rejects invalid JSON", async () => {
    const file = new File(
      ["{invalid json"],
      "workflow.json",
      { type: "application/json" },
    );

    await expect(
      importWorkflowFromFile(file),
    ).rejects.toThrow("Invalid JSON file.");
  });
});
