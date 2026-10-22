import { WorkflowDemo } from "@/features/workflows/components/workflow-demo";
import { getDemoWorkflow } from "@/lib/demo-api";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const graph = await getDemoWorkflow();

  return <WorkflowDemo graph={graph} />;
}
