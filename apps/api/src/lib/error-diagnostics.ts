import { isLocalEnvironment } from "./environment.js";

export interface ErrorDiagnostics {
  name: string;
  code?: string;
  status?: number;
  requestId?: string;
}

/**
 * Allowlisted, non-error diagnostics for provider failures that do not throw,
 * e.g. missing configuration or an unusable provider response.
 */
export interface FailureDiagnostics {
  status?: number;
  requestId?: string;
  responseStatus?: string;
  incompleteReason?: string;
  missingVariables?: string[];
}

// Machine-readable codes only, e.g. Prisma "P2021" or Node "ECONNREFUSED".
const SAFE_ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;
// Provider request IDs, e.g. OpenAI "req_abc123".
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_ENV_VARIABLE = /^[A-Z][A-Z0-9_]{0,63}$/;

function safeString(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

function safeHttpStatus(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
    ? value
    : undefined;
}

/**
 * Error messages and stacks may contain prompts, provider responses, query
 * parameters or credentials, so only the error class, a machine-readable
 * code, a numeric HTTP status and a provider request ID are kept for
 * production logs.
 */
export function getErrorDiagnostics(error: unknown): ErrorDiagnostics {
  if (!(error instanceof Error)) {
    return { name: typeof error };
  }

  const code = safeString(
    "code" in error ? error.code : undefined,
    SAFE_ERROR_CODE,
  );
  const status = safeHttpStatus(
    "status" in error ? error.status : undefined,
  );
  const requestId = safeString(
    "requestID" in error ? error.requestID : undefined,
    SAFE_REQUEST_ID,
  );

  // Some SDKs (e.g. OpenAI) leave `name` as "Error" on subclasses, so the
  // class name identifies the failure, e.g. "RateLimitError". Both values
  // are validated, and an unusual error may lack a usable constructor.
  const errorName = safeString(error.name, SAFE_ERROR_CODE);
  const errorConstructor: unknown = error.constructor;
  const constructorName = safeString(
    typeof errorConstructor === "function" ? errorConstructor.name : undefined,
    SAFE_ERROR_CODE,
  );
  const name =
    errorName && errorName !== "Error"
      ? errorName
      : (constructorName ?? "Error");

  return {
    name,
    ...(code ? { code } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

export function sanitizeFailureDiagnostics(
  diagnostics: FailureDiagnostics,
): FailureDiagnostics {
  const status = safeHttpStatus(diagnostics.status);
  const requestId = safeString(diagnostics.requestId, SAFE_REQUEST_ID);
  const responseStatus = safeString(
    diagnostics.responseStatus,
    SAFE_ERROR_CODE,
  );
  const incompleteReason = safeString(
    diagnostics.incompleteReason,
    SAFE_ERROR_CODE,
  );
  const missingVariables = diagnostics.missingVariables?.filter(
    (name) => SAFE_ENV_VARIABLE.test(name),
  );

  return {
    ...(status !== undefined ? { status } : {}),
    ...(requestId ? { requestId } : {}),
    ...(responseStatus ? { responseStatus } : {}),
    ...(incompleteReason ? { incompleteReason } : {}),
    ...(missingVariables?.length ? { missingVariables } : {}),
  };
}

export function logError(context: string, error: unknown): void {
  if (isLocalEnvironment()) {
    console.error(context, error);
    return;
  }

  console.error(context, getErrorDiagnostics(error));
}

/**
 * Provider SDK errors carry request headers, nested response bodies and
 * messages that may echo API keys or prompts, so they are sanitized in every
 * environment, including local development.
 */
export function logProviderError(context: string, error: unknown): void {
  console.error(context, getErrorDiagnostics(error));
}

export function logFailure(
  context: string,
  diagnostics: FailureDiagnostics,
): void {
  console.error(context, sanitizeFailureDiagnostics(diagnostics));
}
