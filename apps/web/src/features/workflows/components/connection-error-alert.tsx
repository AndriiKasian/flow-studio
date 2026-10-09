
"use client";

import {
  connectionErrorMessages,
  type ConnectionError,
} from "../lib/workflow-connection";

type ConnectionErrorAlertProps = {
  error: ConnectionError | null;
  onDismiss: () => void;
};

export function ConnectionErrorAlert({
  error,
  onDismiss,
}: ConnectionErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-destructive/10 text-destructive border-destructive/30 absolute top-5 left-1/2 z-10 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur"
    >
      <span>{connectionErrorMessages[error]}</span>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss connection error"
        className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
