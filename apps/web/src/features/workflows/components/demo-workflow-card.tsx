import type { WorkflowsResult } from "../lib/load-workflows";

import { WorkflowCard } from "./workflow-card";

// The Demo runs on the backend, so its card reflects the shared workflows
// request; the Connecting version is rendered as the Suspense fallback.
export async function DemoWorkflowCard({
  result,
}: {
  result: Promise<WorkflowsResult>;
}) {
  const { status } = await result;

  return <WorkflowCard variant="demo" status={status} />;
}
