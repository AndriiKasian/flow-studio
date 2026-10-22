/**
 * Relaxed local behaviour is opt-in: only an explicit `development` or `test`
 * NODE_ENV disables production protections. A missing or misconfigured value
 * keeps rate limits, graph sandboxing and log redaction enabled.
 */
export function isLocalEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV;

  return nodeEnv === "development" || nodeEnv === "test";
}
