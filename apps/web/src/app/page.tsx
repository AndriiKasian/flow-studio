import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BackendRetryProvider } from "@/features/workflows/components/backend-status";
import { BackendStatusAnnouncement } from "@/features/workflows/components/backend-status-announcement";
import { DemoWorkflowCard } from "@/features/workflows/components/demo-workflow-card";
import { WorkflowCard } from "@/features/workflows/components/workflow-card";
import { CreateWorkflowDialog } from "@/features/workflows/components/create-workflow-dialog";
import { WorkflowList } from "@/features/workflows/components/workflow-list";
import { WorkflowListFallback } from "@/features/workflows/components/workflow-list-fallback";
import { loadWorkflows } from "@/features/workflows/lib/load-workflows";

export const dynamic = "force-dynamic";
// The workflow list streams in after the API wakes from a cold start; keep
// the function alive longer than FLOWS_REQUEST_TIMEOUT_MS.
export const maxDuration = 90;

export default function Home() {
  // Started without awaiting so the shell streams immediately; the Demo card,
  // the status announcement and the workflow list share this single request.
  const workflows = loadWorkflows();

  return (
    <>
      <AppHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Workflows
            </h1>

            <p className="mt-2 text-muted-foreground">
              Build, manage and run your AI workflows.
            </p>
          </div>

          <CreateWorkflowDialog />
        </div>

        <BackendRetryProvider>
          {/* The only live region for backend status: it announces when
              Suspense swaps in the result, while the visible card badges
              stay silent. */}
          <p aria-live="polite" className="sr-only">
            <Suspense fallback={null}>
              <BackendStatusAnnouncement result={workflows} />
            </Suspense>
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Suspense
              fallback={<WorkflowCard variant="demo" status="connecting" />}
            >
              <DemoWorkflowCard result={workflows} />
            </Suspense>

            <Suspense fallback={<WorkflowListFallback />}>
              <WorkflowList result={workflows} />
            </Suspense>
          </div>
        </BackendRetryProvider>
      </main>
    </>
  );
}
