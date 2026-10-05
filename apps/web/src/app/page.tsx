import { AppHeader } from "@/components/layout/app-header";
import { WorkflowCard } from "@/features/workflows/components/workflow-card";
import { CreateWorkflowDialog } from "@/features/workflows/components/create-workflow-dialog";
import { getFlows } from "@/lib/flows-api";

export default async function Home() {
  const flows = await getFlows();

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <WorkflowCard key={flow.id} flow={flow} />
          ))}
        </div>
      </main>
    </>
  );
}