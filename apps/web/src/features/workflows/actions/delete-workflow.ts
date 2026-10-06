"use server";

import { revalidatePath } from "next/cache";

import { deleteFlow } from "@/lib/flows-api";

export async function deleteWorkflow(id: string) {
  try {
    await deleteFlow(id);

    revalidatePath("/");

    return {
      success: true as const,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to delete workflow",
    };
  }
}