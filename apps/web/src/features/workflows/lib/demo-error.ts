import { demoErrorResponseSchema } from "@flow-studio/shared";

/**
 * Extracts a user-facing message from a failed demo run response body.
 * Supports the API's structured demo errors and the plain `{ error: string }`
 * responses returned by the web proxy itself.
 */
export function getDemoErrorMessage(body: unknown, status: number): string {
  const demoError = demoErrorResponseSchema.safeParse(body);

  if (demoError.success) {
    return demoError.data.error.message;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return `Failed to start demo: HTTP ${status}`;
}
