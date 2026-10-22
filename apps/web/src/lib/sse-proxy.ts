/** Response headers for SSE streams relayed from the API. */
export const SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  // Disable reverse-proxy buffering so events are delivered immediately.
  "X-Accel-Buffering": "no",
} as const;

/** Non-standard status for a request the client aborted (nginx convention). */
export const CLIENT_CLOSED_REQUEST_STATUS = 499;
