import { z } from "zod";
import { workflowGraphSchema } from "./workflow-graph";

export const createFlowSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value ?? null),
});

export type CreateFlowFormInput = z.input<typeof createFlowSchema>;
export type CreateFlowInput = z.output<typeof createFlowSchema>;

export const updateFlowSchema = createFlowSchema.partial();
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;

export const flowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  graph: workflowGraphSchema.nullable(),
});

export type Flow = z.infer<typeof flowSchema>;
