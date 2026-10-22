import { describe, expect, it } from "vitest";

import {
  textInputDataSchema,
  promptTemplateDataSchema,
  llmDataSchema,
} from "../node-config";

describe("Node configuration security limits", () => {
  it("accepts Text Input with 4000 characters", () => {
    const result = textInputDataSchema.safeParse({
      text: "a".repeat(4_000),
    });

    expect(result.success).toBe(true);
  });

  it("rejects Text Input exceeding 4000 characters", () => {
    const result = textInputDataSchema.safeParse({
      text: "a".repeat(4_001),
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized Prompt Template", () => {
    const result = promptTemplateDataSchema.safeParse({
      template: "a".repeat(4_001),
    });

    expect(result.success).toBe(false);
  });

  it("accepts 20 Prompt Template inputs", () => {
    const inputs = Array.from({ length: 20 }, (_, index) => ({
      id: `port-${index}`,
      name: `variable_${index}`,
    }));

    expect(
      promptTemplateDataSchema.safeParse({
        template: "{{variable_0}}",
        inputs,
      }).success,
    ).toBe(true);
  });

  it("rejects more than 20 Prompt Template inputs", () => {
    const inputs = Array.from({ length: 21 }, (_, index) => ({
      id: `port-${index}`,
      name: `variable_${index}`,
    }));

    expect(
      promptTemplateDataSchema.safeParse({
        template: "{{variable_0}}",
        inputs,
      }).success,
    ).toBe(false);
  });

  it("rejects oversized LLM system prompt", () => {
    const result = llmDataSchema.safeParse({
      systemPrompt: "a".repeat(4_001),
    });

    expect(result.success).toBe(false);
  });
});
