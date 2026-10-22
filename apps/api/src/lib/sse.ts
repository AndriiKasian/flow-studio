export const SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Disable reverse-proxy buffering so events are delivered immediately.
  "X-Accel-Buffering": "no",
} as const;
