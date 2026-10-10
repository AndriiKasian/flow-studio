
import { z } from "zod";

import {
  userInputDataSchema,
  textInputDataSchema,
  promptTemplateDataSchema,
  llmDataSchema,
  textTransformDataSchema,
  textOutputDataSchema,
} from "./node-config";

export const workflowNodeTypeSchema = z.enum([
  "userInput",
  "textInput",
  "promptTemplate",
  "llm",
  "textTransform",
  "textOutput",
]);

const baseNodeSchema = z.object({
  id: z.string().min(1),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  origin: z.tuple([z.number(), z.number()]).optional(),
});

export const workflowNodeSchema = z.discriminatedUnion("type", [
  baseNodeSchema.extend({
    type: z.literal("userInput"),
    data: userInputDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("textInput"),
    data: textInputDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("promptTemplate"),
    data: promptTemplateDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("llm"),
    data: llmDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("textTransform"),
    data: textTransformDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("textOutput"),
    data: textOutputDataSchema,
  }),
]);

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.literal("workflow").optional(),
  data: z
    .object({
      color: z.string().optional(),
      status: z
        .enum(["idle", "running", "completed", "failed", "skipped"])
        .optional(),
    })
    .optional(),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;
