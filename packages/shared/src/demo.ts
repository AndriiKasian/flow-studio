import { z } from "zod";

export const demoErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryAfterSeconds: z.number().int().nonnegative().nullable(),
  }),
});

export type DemoErrorResponse = z.infer<typeof demoErrorResponseSchema>;
