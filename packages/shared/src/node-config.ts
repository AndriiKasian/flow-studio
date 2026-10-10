
import { z } from "zod";

export const userInputDataSchema = z.strictObject({
  variableName: z.string().optional(),
  defaultValue: z.string().optional(),
});

export const textInputDataSchema = z.strictObject({
  text: z.string().optional(),
});

export const promptTemplateDataSchema = z.strictObject({
  template: z.string().optional(),
});

export const llmDataSchema = z.strictObject({
  model: z
    .enum(["claude-sonnet", "claude-haiku", "openai-gpt"])
    .optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().finite().min(0).max(2).optional(),
});

export const textTransformDataSchema = z.strictObject({
  operation: z
    .enum(["trim", "uppercase", "lowercase"])
    .optional(),
});

export const textOutputDataSchema = z.strictObject({
  result: z.string().optional(),
});
