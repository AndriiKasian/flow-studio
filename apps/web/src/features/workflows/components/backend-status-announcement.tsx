import type { WorkflowsResult } from "../lib/load-workflows";

import { BackendStatusBadge } from "./backend-status";

// Rendered inside the Dashboard's single polite live region, so screen
// readers hear "Server status: …" when the shared request settles or a retry
// starts, without re-reading whole cards.
export async function BackendStatusAnnouncement({
  result,
}: {
  result: Promise<WorkflowsResult>;
}) {
  const { status } = await result;

  return <BackendStatusBadge status={status} />;
}
