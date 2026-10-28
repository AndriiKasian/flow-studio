import type { Flow, WorkflowGraph } from "@flow-studio/shared";

import { getDemoWorkflow } from "@/lib/demo-api";
import { getFlow } from "@/lib/flows-api";

export type WorkflowResult =
  | { status: "ready"; flow: Flow }
  | { status: "not-found" }
  | { status: "unavailable" };

export type DemoWorkflowResult =
  | { status: "ready"; graph: WorkflowGraph }
  | { status: "unavailable" };

// Only a 404 from the API means the workflow is missing. Network failures,
// timeouts and other errors mean the API is unavailable, so the page offers
// Retry instead of a not-found page.
export async function loadWorkflow(id: string): Promise<WorkflowResult> {
  try {
    const flow = await getFlow(id);

    return flow ? { status: "ready", flow } : { status: "not-found" };
  } catch (error) {
    console.error("Failed to fetch workflow:", error);

    return { status: "unavailable" };
  }
}

export async function loadDemoWorkflow(): Promise<DemoWorkflowResult> {
  try {
    return { status: "ready", graph: await getDemoWorkflow() };
  } catch (error) {
    console.error("Failed to fetch demo workflow:", error);

    return { status: "unavailable" };
  }
}
