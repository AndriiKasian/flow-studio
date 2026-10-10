import { notFound } from "next/navigation";
import { WorkflowEditor } from "@/features/workflows/components/workflow-editor";
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

  return <WorkflowEditor flow={flow} />;
}