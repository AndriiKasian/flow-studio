import type { WorkflowsResult } from "../lib/load-workflows";

import { BackendStatusBadge } from "./backend-status";

// Readiness reflects whether the backend answered the Dashboard's workflows
// request, shared with WorkflowList so no separate health request is made.
export async function DemoBackendStatus({
  result,
}: {
  result: Promise<WorkflowsResult>;
}) {
  const { status } = await result;

  return <BackendStatusBadge status={status} />;
}
