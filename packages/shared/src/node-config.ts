import { z } from "zod";

const MAX_TEXT_LENGTH = 4_000;
const MAX_TEMPLATE_LENGTH = 4_000;
const MAX_TEMPLATE_INPUTS = 20;
const MAX_IDENTIFIER_LENGTH = 100;

export const userInputDataSchema = z.strictObject({
  variableName: z.string().max(MAX_IDENTIFIER_LENGTH).optional(),
  defaultValue: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const textInputDataSchema = z.strictObject({
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const promptTemplateInputSchema = z.strictObject({
  id: z.string().min(1).max(MAX_IDENTIFIER_LENGTH),
  name: z
    .string()
    .max(MAX_IDENTIFIER_LENGTH)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
});

export const promptTemplateDataSchema = z.strictObject({
  template: z.string().max(MAX_TEMPLATE_LENGTH).optional(),
  inputs: z
    .array(promptTemplateInputSchema)
    .max(MAX_TEMPLATE_INPUTS)
    .optional(),
});

export const llmDataSchema = z.strictObject({
  systemPrompt: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const textTransformDataSchema = z.strictObject({
  operation: z
    .enum(["trim", "uppercase", "lowercase"])
    .optional(),
});

export const textOutputDataSchema = z.strictObject({});

export const webSearchDataSchema = z.strictObject({});

export const jsonOutputDataSchema = z.strictObject({});
