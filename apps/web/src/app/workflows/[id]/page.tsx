import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackendRetryProvider } from "@/features/workflows/components/backend-status";
import { WorkflowEditorLoader } from "@/features/workflows/components/workflow-editor-loader";
import { WorkflowEditorPlaceholder } from "@/features/workflows/components/workflow-editor-placeholder";
import { isFlowId } from "@/lib/flows-api";

export const dynamic = "force-dynamic";
// The workflow streams in after the API wakes from a cold start; keep the
// function alive longer than FLOWS_REQUEST_TIMEOUT_MS.
export const maxDuration = 90;

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({
  params,
}: WorkflowPageProps) {
  const { id } = await params;

  // Rejected before streaming starts, so malformed IDs keep a 404 status.
  if (!isFlowId(id)) {
    notFound();
  }

  return (
    <BackendRetryProvider>
      <Suspense fallback={<WorkflowEditorPlaceholder status="connecting" />}>
        <WorkflowEditorLoader id={id} />
      </Suspense>
    </BackendRetryProvider>
  );
}
