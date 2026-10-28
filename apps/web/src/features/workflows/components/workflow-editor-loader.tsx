import { notFound } from "next/navigation";

import { loadWorkflow } from "../lib/load-workflow";

import { WorkflowEditor } from "./workflow-editor";
import { WorkflowEditorPlaceholder } from "./workflow-editor-placeholder";

// Rendered inside a Suspense boundary so the editor shell does not wait for
// the API, which may be waking from a cold start.
export async function WorkflowEditorLoader({ id }: { id: string }) {
  const result = await loadWorkflow(id);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unavailable") {
    return <WorkflowEditorPlaceholder status="unavailable" />;
  }

  return <WorkflowEditor flow={result.flow} />;
}
