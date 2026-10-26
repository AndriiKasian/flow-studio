import type { Flow } from "@flow-studio/shared";

import { getFlows } from "@/lib/flows-api";

export type WorkflowsResult =
  | { status: "ready"; flows: Flow[] }
  | { status: "unavailable" };

// Never rejects, so one request can be shared by every Dashboard section that
// reflects backend readiness without unhandled rejections.
export async function loadWorkflows(): Promise<WorkflowsResult> {
  try {
    return { status: "ready", flows: await getFlows() };
  } catch (error) {
    console.error("Failed to fetch workflows:", error);

    return { status: "unavailable" };
  }
}
