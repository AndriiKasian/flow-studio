import { describe, expect, it } from "vitest";

import {
  isActiveInputHandle,
  validateWorkflowConnection,
  validateImportedWorkflowGraph,
  type ConnectionNode,
  type ConnectionEdge,
} from "../workflow-connection";

const nodes: ConnectionNode[] = [
  { id: "input", type: "textInput" },
  { id: "transform", type: "textTransform" },
  { id: "transform2", type: "textTransform" },
  { id: "prompt", type: "promptTemplate" },
  { id: "output", type: "textOutput" },
];

function createConnection(
  source: string,
  target: string,
  sourceHandle: string | null,
  targetHandle: string | null,
): ConnectionEdge {
  return {
    source,
    target,
    sourceHandle,
    targetHandle,
  };
}

function createEdge(
  id: string,
  connection: ConnectionEdge,
): ConnectionEdge {
  return {
    ...connection,
    id,
  };
}

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

  it("rejects missing handles", () => {
    const connection = createConnection(
      "input",
      "transform",
      null,
      null,
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
          "transform2",
          "prompt",
          "input",
        ),
      ),
    ];

    const connection = createConnection(
      "transform2",
      "transform",
      "output",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, edges),
    ).toBe("cycle");
  });

  it("rejects an output handle on a terminal node", () => {
    const connection = createConnection(
      "output",
      "transform",
      "output",
      "input",
    );

    expect(
      validateWorkflowConnection(connection, nodes, []),
    ).toBe("invalid");
  });
});

describe("validateImportedWorkflowGraph", () => {
  it("accepts a valid graph", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "input",
          "transform",
          "text",
          "input",
        ),
      ),
      createEdge(
        "edge-2",
        createConnection(
          "transform",
          "output",
          "output",
          "input",
        ),
      ),
    ];

    expect(
      validateImportedWorkflowGraph(nodes, edges),
    ).toBeNull();
  });

  it("rejects duplicate node IDs", () => {
    const duplicatedNodes = [
      ...nodes,
      { id: "input", type: "textInput" },
    ];

    expect(
      validateImportedWorkflowGraph(duplicatedNodes, []),
    ).toBe("duplicate");
  });

  it("rejects duplicate edge IDs", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "input",
          "transform",
          "text",
          "input",
        ),
      ),
      createEdge(
        "edge-1",
        createConnection(
          "transform",
          "output",
          "output",
          "input",
        ),
      ),
    ];

    expect(
      validateImportedWorkflowGraph(nodes, edges),
    ).toBe("duplicate");
  });

  it("rejects unknown node types", () => {
    const invalidNodes: ConnectionNode[] = [
      { id: "unknown", type: "unknownType" },
    ];

    expect(
      validateImportedWorkflowGraph(invalidNodes, []),
    ).toBe("invalid");
  });

  it("rejects multiple connections to the same input", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "input",
          "transform",
          "text",
          "input",
        ),
      ),
      createEdge(
        "edge-2",
        createConnection(
          "prompt",
          "transform",
          "prompt",
          "input",
        ),
      ),
    ];

    expect(
      validateImportedWorkflowGraph(nodes, edges),
    ).toBe("occupied");
  });

  it("rejects cyclic graphs", () => {
    const cyclicNodes: ConnectionNode[] = [
      { id: "transform", type: "textTransform" },
      {
        id: "prompt",
        type: "promptTemplate",
        data: {
          template: "Process {{input}}",
        },
      },
    ];

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
          "transform",
          "prompt",
          "input",
        ),
      ),
    ];

    expect(
      validateImportedWorkflowGraph(cyclicNodes, edges),
    ).toBe("cycle");
  });

  it("rejects edges referencing missing nodes", () => {
    const edges = [
      createEdge(
        "edge-1",
        createConnection(
          "missing",
          "transform",
          "text",
          "input",
        ),
      ),
    ];

    expect(
      validateImportedWorkflowGraph(nodes, edges),
    ).toBe("invalid");
  });
});

describe("stable Prompt Template handles", () => {
  const stableNodes: ConnectionNode[] = [
    { id: "source", type: "textInput" },
    {
      id: "prompt",
      type: "promptTemplate",
      data: {
        template: "Hello {{first}}",
        inputs: [
          { id: "input-1", name: "first" },
          { id: "input-2", name: "removed" },
        ],
      },
    },
  ];

  it("accepts stable port IDs after renaming", () => {
    expect(
      validateWorkflowConnection(
        {
          source: "source",
          sourceHandle: "text",
          target: "prompt",
          targetHandle: "input-1",
        },
        stableNodes,
        [],
      ),
    ).toBeNull();
  });

  it("preserves edges for temporarily inactive ports on import", () => {
    expect(
      validateImportedWorkflowGraph(stableNodes, [
        {
          id: "edge-1",
          source: "source",
          sourceHandle: "text",
          target: "prompt",
          targetHandle: "input-2",
        },
      ]),
    ).toBeNull();
  });

  it("rejects an unknown port ID", () => {
    expect(
      validateWorkflowConnection(
        {
          source: "source",
          sourceHandle: "text",
          target: "prompt",
          targetHandle: "unknown",
        },
        stableNodes,
        [],
      ),
    ).toBe("invalid");
  });
});

describe("isActiveInputHandle", () => {
  const prompt: ConnectionNode = {
    id: "prompt",
    type: "promptTemplate",
    data: {
      template: "Hello {{first}}",
      inputs: [
        { id: "input-1", name: "first" },
        { id: "input-2", name: "removed" },
      ],
    },
  };

  it("treats ports referenced by the template as active", () => {
    expect(isActiveInputHandle(prompt, "input-1")).toBe(true);
  });

  it("treats ports of removed variables as inactive", () => {
    expect(isActiveInputHandle(prompt, "input-2")).toBe(false);
  });

  it("uses variable names for legacy Prompt Template nodes", () => {
    const legacy: ConnectionNode = {
      id: "prompt",
      type: "promptTemplate",
      data: { template: "Hello {{first}}" },
    };

    expect(isActiveInputHandle(legacy, "first")).toBe(true);
    expect(isActiveInputHandle(legacy, "other")).toBe(false);
  });

  it("treats inputs of other node types as active", () => {
    expect(
      isActiveInputHandle({ id: "output", type: "textOutput" }, "input"),
    ).toBe(true);
  });
});
