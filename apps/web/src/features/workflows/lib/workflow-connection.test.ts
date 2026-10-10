
import type { Connection, Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { validateWorkflowConnection } from "./workflow-connection";

const nodes: Node[] = [
  {
    id: "input",
    type: "textInput",
    position: { x: 0, y: 0 },
    data: {},
  },
  {
    id: "transform",
    type: "textTransform",
    position: { x: 200, y: 0 },
    data: {},
  },
  {
    id: "prompt",
    type: "promptTemplate",
    position: { x: 400, y: 0 },
    data: {},
  },
  {
    id: "output",
    type: "textOutput",
    position: { x: 600, y: 0 },
    data: {},
  },
];

const createConnection = (
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): Connection => ({
  source,
  target,
  sourceHandle,
  targetHandle,
});

const createEdge = (
  id: string,
  connection: Connection,
): Edge => ({
  id,
  ...connection,
});

describe("validateWorkflowConnection", () => {
  it("allows a valid connection", () => {
    const connection = createConnection(
      "input",
      "transform",
      "text",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBeNull();
  });

  it("rejects connecting a node to itself", () => {
    const connection = createConnection(
      "transform",
      "transform",
      "output",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBe("self");
  });

  it("rejects an invalid source handle", () => {
    const connection = createConnection(
      "input",
      "transform",
      "unknown",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBe("invalid");
  });

  it("rejects an invalid target handle", () => {
    const connection = createConnection(
      "input",
      "transform",
      "text",
      "unknown",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBe("invalid");
  });

  it("rejects connections to nonexistent nodes", () => {
    const connection = createConnection(
      "missing",
      "transform",
      "text",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBe("invalid");
  });

  it("rejects connections to an occupied input", () => {
    const existingConnection = createConnection(
      "input",
      "transform",
      "text",
      "input",
    );

    const newConnection = createConnection(
      "prompt",
      "transform",
      "prompt",
      "input",
    );

    const edges = [
      createEdge("edge-1", existingConnection),
    ];

    expect(
      validateWorkflowConnection(newConnection, nodes, edges),
    ).toBe("occupied");
  });

  it("rejects a direct cycle", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "transform",
          "prompt",
          "output",
          "input",
        ),
      ),
    ];

    const connection = createConnection(
      "prompt",
      "transform",
      "prompt",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, edges),
    ).toBe("cycle");
  });

  it("rejects a cycle across multiple nodes", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "transform",
          "prompt",
          "output",
          "input",
        ),
      ),
      createEdge(
        "edge-2",
        createConnection(
          "prompt",
          "output",
          "prompt",
          "input",
        ),
      ),
    ];

    const connection = createConnection(
      "output",
      "transform",
      "output",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, edges),
    ).toBe("invalid");
  });
});
