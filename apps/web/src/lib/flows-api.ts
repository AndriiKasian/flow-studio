import {
  flowSchema,
  type CreateFlowInput,
  type Flow,
  type UpdateFlowInput,
  type WorkflowGraph,
} from "@flow-studio/shared";
import { headers } from "next/headers";

import { buildTrustedProxyHeaders } from "./trusted-proxy";

function getApiUrl(): string {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  return apiUrl;
}

// Workflow IDs are UUIDs. Validating them keeps client-supplied IDs (route
// params, Server Action arguments) from changing the requested API path, e.g.
// "." and ".." segments, which encodeURIComponent leaves unencoded.
function isFlowId(id: string): boolean {
  return flowSchema.shape.id.safeParse(id).success;
}

function getFlowUrl(id: string): string {
  if (!isFlowId(id)) {
    throw new Error("Invalid workflow ID");
  }

  return `${getApiUrl()}/flows/${encodeURIComponent(id)}`;
}

// Identifies the visitor to the API for per-visitor write rate limits.
async function getTrustedProxyHeaders(): Promise<Record<string, string>> {
  return buildTrustedProxyHeaders(
    await headers(),
    process.env.TRUSTED_PROXY_SECRET,
  );
}

export async function getFlows(): Promise<Flow[]> {
  const response = await fetch(`${getApiUrl()}/flows`);

  if (!response.ok) {
    throw new Error("Failed to fetch flows");
  }

  return response.json() as Promise<Flow[]>;
}

export async function getFlow(id: string): Promise<Flow | null> {
  if (!isFlowId(id)) {
    return null;
  }

  const response = await fetch(getFlowUrl(id));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch flow");
  }

  return response.json() as Promise<Flow>;
}

export async function createFlow(input: CreateFlowInput): Promise<Flow> {
  const response = await fetch(`${getApiUrl()}/flows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getTrustedProxyHeaders()),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create flow");
  }

  return response.json() as Promise<Flow>;
}

export async function updateFlow(
  id: string,
  input: UpdateFlowInput,
): Promise<Flow> {
  const response = await fetch(getFlowUrl(id), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await getTrustedProxyHeaders()),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update flow");
  }

  return response.json() as Promise<Flow>;
}

export async function deleteFlow(id: string): Promise<void> {
  const response = await fetch(getFlowUrl(id), {
    method: "DELETE",
    headers: await getTrustedProxyHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete flow");
  }
}

export async function saveFlowGraph(
  id: string,
  graph: WorkflowGraph,
): Promise<void> {
  const response = await fetch(`${getFlowUrl(id)}/graph`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await getTrustedProxyHeaders()),
    },
    body: JSON.stringify(graph),
  });

  if (!response.ok) {
    throw new Error("Failed to save workflow graph");
  }
}