import { BackendStatusBadge } from "./backend-status";

export function WorkflowListFallback() {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="bg-muted size-10 animate-pulse rounded-lg" />
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
