"use server";

import { workflowGraphSchema } from "@flow-studio/shared";

import { saveFlowGraph } from "@/lib/flows-api";

export async function saveWorkflowGraph(
  id: string,
  input: unknown,
) {
  const result = workflowGraphSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false as const,
      error: "Invalid workflow graph",
    };
  }

  try {
    await saveFlowGraph(id, result.data);

    return {
      success: true as const,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to save workflow graph",
    };
  }
}