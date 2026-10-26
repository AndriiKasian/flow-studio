import type { WorkflowsResult } from "../lib/load-workflows";

import { WorkflowCard } from "./workflow-card";
import { WorkflowListError } from "./workflow-list-error";

// Rendered inside a Suspense boundary so the Dashboard shell does not wait
// for the API, which may be waking from a cold start.
export async function WorkflowList({
  result,
}: {
  result: Promise<WorkflowsResult>;
}) {
  const workflows = await result;

  if (workflows.status === "unavailable") {
    return <WorkflowListError />;
  }

  return workflows.flows.map((flow) => (
    <WorkflowCard key={flow.id} flow={flow} status="ready" />
  ));
}
