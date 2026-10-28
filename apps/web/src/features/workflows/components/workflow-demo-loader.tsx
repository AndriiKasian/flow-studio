import { loadDemoWorkflow } from "../lib/load-workflow";

import { WorkflowDemo } from "./workflow-demo";
import { WorkflowEditorPlaceholder } from "./workflow-editor-placeholder";

// Rendered inside a Suspense boundary so the Demo shell does not wait for
// the API, which may be waking from a cold start.
export async function WorkflowDemoLoader() {
  const result = await loadDemoWorkflow();

  if (result.status === "unavailable") {
    return <WorkflowEditorPlaceholder status="unavailable" />;
  }

  return <WorkflowDemo graph={result.graph} />;
}
