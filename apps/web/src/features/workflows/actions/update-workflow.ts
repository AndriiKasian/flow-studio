"use server";

import { updateFlowSchema } from "@flow-studio/shared";
import { revalidatePath } from "next/cache";

import { updateFlow } from "@/lib/flows-api";

export async function updateWorkflow(id: string, input: unknown) {
  const result = updateFlowSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false as const,
      error: "Invalid workflow data",
    };
  }

  try {
    const flow = await updateFlow(id, result.data);

    revalidatePath("/");

    return {
      success: true as const,
      flow,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to update workflow",
    };
  }
}