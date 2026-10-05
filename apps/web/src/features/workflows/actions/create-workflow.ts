"use server";

import { createFlowSchema } from "@flow-studio/shared";
import { revalidatePath } from "next/cache";

import { createFlow } from "@/lib/flows-api";

export async function createWorkflow(input: unknown) {
  const result = createFlowSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false as const,
      error: "Invalid workflow data",
    };
  }

  try {
    const flow = await createFlow(result.data);

    revalidatePath("/");

    return {
      success: true as const,
      flow,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to create workflow",
    };
  }
}