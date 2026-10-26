import { TriangleAlert } from "lucide-react";

import { BackendRetryButton, BackendStatusBadge } from "./backend-status";

export function WorkflowListError() {
  return (
    <div
      role="alert"
      className="bg-card text-card-foreground rounded-xl border p-5"
    >
      <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </div>

      <p className="font-semibold tracking-tight">Workflows unavailable</p>

      <p className="mt-2 min-h-10 text-sm text-muted-foreground">
        The server did not respond. It may still be starting up — please try
        again.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <BackendStatusBadge status="unavailable" />

        <BackendRetryButton />
      </div>
    </div>
  );
}
