import { LoaderCircle } from "lucide-react";

export function WorkflowListFallback() {
  return (
    <div
      role="status"
      className="bg-card text-card-foreground rounded-xl border p-5"
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="bg-muted size-10 animate-pulse rounded-lg" />

        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin text-muted-foreground"
        />
      </div>

      <p className="font-semibold tracking-tight">
        Connecting to demo server…
      </p>

      <p className="mt-2 min-h-10 text-sm text-muted-foreground">
        Loading workflows. The first load after a period of inactivity can take
        up to a minute.
      </p>

      <div className="bg-muted mt-6 h-4 w-24 animate-pulse rounded" />
    </div>
  );
}
