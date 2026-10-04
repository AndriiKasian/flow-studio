import { z } from "zod";

export const createFlowSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullish().transform((value) => value ?? null),
});
export type CreateFlowInput = z.infer<typeof createFlowSchema>;

export const updateFlowSchema = createFlowSchema.partial();
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;