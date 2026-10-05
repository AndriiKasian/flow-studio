import type { CreateFlowInput, Flow } from "@flow-studio/shared";

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("API_URL is not configured");
}

export async function getFlows(): Promise<Flow[]> {
  const response = await fetch(`${API_URL}/flows`);

  if (!response.ok) {
    throw new Error("Failed to fetch flows");
  }

  return response.json() as Promise<Flow[]>;
}

export async function createFlow(input: CreateFlowInput): Promise<Flow> {
  const response = await fetch(`${API_URL}/flows`, {
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