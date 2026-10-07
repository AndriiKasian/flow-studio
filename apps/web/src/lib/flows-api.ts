import type { CreateFlowInput, Flow, UpdateFlowInput } from "@flow-studio/shared";

function getApiUrl(): string {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  return apiUrl;
}

export async function getFlows(): Promise<Flow[]> {
  const response = await fetch(`${getApiUrl()}/flows`);

  if (!response.ok) {
    throw new Error("Failed to fetch flows");
  }

  return response.json() as Promise<Flow[]>;
}

export async function getFlow(id: string): Promise<Flow | null> {
  const response = await fetch(`${getApiUrl()}/flows/${id}`);

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
  const response = await fetch(`${getApiUrl()}/flows/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update flow");
  }

  return response.json() as Promise<Flow>;
}

export async function deleteFlow(id: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/flows/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete flow");
  }
}