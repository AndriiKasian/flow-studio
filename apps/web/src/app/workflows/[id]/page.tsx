import { notFound } from "next/navigation";

import { WorkflowCanvas } from "@/features/workflows/components/workflow-canvas";
import { WorkflowEditorHeader } from "@/features/workflows/components/workflow-editor-header";
import { WorkflowEditorSidebar } from "@/features/workflows/components/workflow-editor-sidebar";
import { getFlow } from "@/lib/flows-api";

export const dynamic = "force-dynamic";

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({
  params,
}: WorkflowPageProps) {
  const { id } = await params;
  const flow = await getFlow(id);

  if (!flow) {
    notFound();
  }

  return (
    <div className="workflow-editor flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader flow={flow} />

      <div className="flex min-h-0 flex-1">
        <WorkflowEditorSidebar />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <WorkflowCanvas />
        </main>
      </div>
    </div>
  );
}