import { z } from "zod";

export const userInputDataSchema = z.strictObject({
  variableName: z.string().optional(),
  defaultValue: z.string().optional(),
});

export const textInputDataSchema = z.strictObject({
  text: z.string().optional(),
});

export const promptTemplateInputSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
});

export const promptTemplateDataSchema = z.strictObject({
  template: z.string().optional(),
  inputs: z.array(promptTemplateInputSchema).optional(),
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

export const textOutputDataSchema = z.strictObject({});
