import type { WorkflowGraph } from "@flow-studio/shared";

function getApiUrl(): string {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  return apiUrl;
}

export async function getDemoWorkflow(): Promise<WorkflowGraph> {
  const response = await fetch(`${getApiUrl()}/api/demo/workflow`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to fetch demo workflow: HTTP ${response.status} — ${body}`,
    );
  }

  return response.json() as Promise<WorkflowGraph>;
}