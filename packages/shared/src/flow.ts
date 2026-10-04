import { z } from "zod";

export const createFlowSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateFlowInput = z.infer<typeof createFlowSchema>;