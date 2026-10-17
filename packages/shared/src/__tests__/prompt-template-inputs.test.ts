import { describe, expect, it } from "vitest";
import {
  getActivePromptTemplateInputs,
  syncPromptTemplateInputs,
  type PromptTemplateInput,
} from "../prompt-template-inputs";

function createIdFactory() {
  let counter = 0;
  return () => `new-${++counter}`;
}

const unexpectedIdCreation = () => {
  throw new Error("Unexpected port creation");
};

const noConnections = new Set<string>();

describe("syncPromptTemplateInputs", () => {
  it("creates ports for new variables", () => {
    const result = syncPromptTemplateInputs(
      "{{name}} {{age}}",
      [],
      noConnections,
      createIdFactory(),
    );

    expect(result).toEqual([
      { id: "new-1", name: "name" },
      { id: "new-2", name: "age" },
    ]);
  });

  it("preserves IDs when variables are reordered", () => {
    const previous: PromptTemplateInput[] = [
      { id: "input-1", name: "name" },
      { id: "input-2", name: "age" },
    ];

    const result = syncPromptTemplateInputs(
      "{{age}} {{name}}",
      previous,
      noConnections,
      unexpectedIdCreation,
    );

    expect(result).toEqual([
      { id: "input-2", name: "age" },
      { id: "input-1", name: "name" },
    ]);
  });

  it("does not duplicate ports for repeated variables", () => {
    const result = syncPromptTemplateInputs(
      "{{name}} {{name}}",
      [],
      noConnections,
      createIdFactory(),
    );

    expect(result).toEqual([{ id: "new-1", name: "name" }]);
  });

  it("keeps a removed variable's port while it is connected", () => {
    const previous: PromptTemplateInput[] = [
      { id: "input-1", name: "name" },
      { id: "input-2", name: "age" },
    ];

    const result = syncPromptTemplateInputs(
      "{{name}}",
      previous,
      new Set(["input-2"]),
      unexpectedIdCreation,
    );

    expect(result).toEqual(previous);
    expect(getActivePromptTemplateInputs("{{name}}", result)).toEqual([
      { id: "input-1", name: "name" },
    ]);
  });

  it("drops a removed variable's port when it has no connection", () => {
    const result = syncPromptTemplateInputs(
      "{{name}}",
      [
        { id: "input-1", name: "name" },
        { id: "input-2", name: "age" },
      ],
      noConnections,
      unexpectedIdCreation,
    );

    expect(result).toEqual([{ id: "input-1", name: "name" }]);
  });

  it("reactivates the original port when a variable is added back", () => {
    const removed = syncPromptTemplateInputs(
      "",
      [{ id: "input-1", name: "name" }],
      new Set(["input-1"]),
      unexpectedIdCreation,
    );

    const restored = syncPromptTemplateInputs(
      "{{name}}",
      removed,
      new Set(["input-1"]),
      unexpectedIdCreation,
    );

    expect(restored).toEqual([{ id: "input-1", name: "name" }]);
  });

  it("never reassigns a connected port to a renamed variable", () => {
    const result = syncPromptTemplateInputs(
      "{{first}}",
      [{ id: "input-1", name: "name" }],
      new Set(["input-1"]),
      createIdFactory(),
    );

    expect(result).toEqual([
      { id: "new-1", name: "first" },
      { id: "input-1", name: "name" },
    ]);
  });

  it("does not accumulate ports while a variable is typed", () => {
    const createId = createIdFactory();
    const connected = new Set(["input-1"]);

    let inputs: PromptTemplateInput[] = [
      { id: "input-1", name: "name" },
    ];

    for (const template of [
      "{{nam}}",
      "{{na}}",
      "{{}}",
      "{{f}}",
      "{{fi}}",
      "{{first}}",
    ]) {
      inputs = syncPromptTemplateInputs(
        template,
        inputs,
        connected,
        createId,
      );
    }

    expect(inputs).toEqual([
      { id: "new-5", name: "first" },
      { id: "input-1", name: "name" },
    ]);
  });
});

describe("getActivePromptTemplateInputs", () => {
  it("uses variable names as port IDs for legacy nodes", () => {
    expect(
      getActivePromptTemplateInputs("{{topic}} {{topic}}", undefined),
    ).toEqual([{ id: "topic", name: "topic" }]);
  });

  it("returns only ports referenced by the template", () => {
    expect(
      getActivePromptTemplateInputs("{{b}}", [
        { id: "input-1", name: "a" },
        { id: "input-2", name: "b" },
      ]),
    ).toEqual([{ id: "input-2", name: "b" }]);
  });
});
