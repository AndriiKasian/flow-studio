import { Suspense } from "react";

import { BackendRetryProvider } from "@/features/workflows/components/backend-status";
import { WorkflowDemoLoader } from "@/features/workflows/components/workflow-demo-loader";
import { WorkflowEditorPlaceholder } from "@/features/workflows/components/workflow-editor-placeholder";

export const dynamic = "force-dynamic";
// The Demo streams in after the API wakes from a cold start; keep the
// function alive longer than FLOWS_REQUEST_TIMEOUT_MS.
export const maxDuration = 90;

export default function DemoPage() {
  return (
    <BackendRetryProvider>
      <Suspense fallback={<WorkflowEditorPlaceholder status="connecting" />}>
        <WorkflowDemoLoader />
      </Suspense>
    </BackendRetryProvider>
  );
}
