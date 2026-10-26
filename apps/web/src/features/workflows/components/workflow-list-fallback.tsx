import { BackendStatusBadge } from "./backend-status";
import { WorkflowCardIcon } from "./workflow-card";

export function WorkflowListFallback() {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5">
      {/* Mirrors the WorkflowCard header; only the unknown update date is a
          skeleton. */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <WorkflowCardIcon />

        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      </div>

      <p className="font-semibold tracking-tight">
        Connecting to demo server…
      </p>

      <p className="mt-2 min-h-10 text-sm text-muted-foreground">
        Loading workflows. The first load after a period of inactivity can take
        up to a minute.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <BackendStatusBadge status="connecting" />
      </div>
    </div>
  );
}
