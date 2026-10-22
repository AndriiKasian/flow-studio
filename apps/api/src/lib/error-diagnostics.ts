import { isLocalEnvironment } from "./environment.js";

export interface ErrorDiagnostics {
  name: string;
  code?: string;
}

// Machine-readable codes only, e.g. Prisma "P2021" or Node "ECONNREFUSED".
const SAFE_ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Error messages and stacks may contain prompts, provider responses, query
 * parameters or credentials, so only the error class and a machine-readable
 * code are kept for production logs.
 */
export function getErrorDiagnostics(error: unknown): ErrorDiagnostics {
  if (!(error instanceof Error)) {
    return { name: typeof error };
  }

  const code: unknown = "code" in error ? error.code : undefined;

  return {
    name: error.name,
    ...(typeof code === "string" && SAFE_ERROR_CODE.test(code)
      ? { code }
      : {}),
  };
}

export function logError(context: string, error: unknown): void {
  if (isLocalEnvironment()) {
    console.error(context, error);
    return;
  }

  console.error(context, getErrorDiagnostics(error));
}
