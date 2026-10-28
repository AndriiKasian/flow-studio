import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";

import {
  BackendRetryButton,
  BackendStatusBadge,
  type BackendStatus,
} from "./backend-status";

type WorkflowEditorPlaceholderProps = {
  status: Exclude<BackendStatus, "ready">;
};

// Shown by the workflow editor and the Demo while their workflow loads from
// the API, which may be waking from a cold start, and when it is unavailable.
// Mirrors the editor header so only the canvas content changes once ready.
export function WorkflowEditorPlaceholder({
  status,
}: WorkflowEditorPlaceholderProps) {
  const isUnavailable = status === "unavailable";

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <header className="border-border/60 bg-background/95 flex h-16 shrink-0 items-center border-b backdrop-blur">
        <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r px-5">
          <Link
            href="/"
            aria-label="Back to workflows"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <FlowStudioLogo size={32} />

          <span className="font-semibold tracking-tight">
            AI Flow Studio
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between px-5">
          {/* The workflow name is unknown until the API responds. */}
          <div className="space-y-2">
            <div className="bg-muted h-4 w-40 animate-pulse rounded" />
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="bg-muted/30 relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        <div
          role={isUnavailable ? "alert" : undefined}
          className="bg-card text-card-foreground w-full max-w-sm rounded-xl border p-5"
        >
          {isUnavailable && (
            <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </div>
          )}

          <p className="font-semibold tracking-tight">
            {isUnavailable
              ? "Workflow unavailable"
              : "Connecting to backend…"}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            {isUnavailable
              ? "The server did not respond. It may still be starting up — please try again."
              : "Loading the workflow. The first load after a period of inactivity can take up to a minute."}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <BackendStatusBadge status={status} />

            {isUnavailable && <BackendRetryButton />}
          </div>
        </div>
      </main>
    </div>
  );
}
