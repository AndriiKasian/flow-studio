import type { Flow } from "@flow-studio/shared";

import { getFlows } from "@/lib/flows-api";

import { WorkflowCard } from "./workflow-card";
import { WorkflowListError } from "./workflow-list-error";

// Rendered inside a Suspense boundary so the Dashboard shell does not wait
// for the API, which may be waking from a cold start.
export async function WorkflowList() {
  let flows: Flow[];

  try {
    flows = await getFlows();
  } catch (error) {
    console.error("Failed to fetch workflows:", error);

    return <WorkflowListError />;
  }

  return flows.map((flow) => <WorkflowCard key={flow.id} flow={flow} />);
}
