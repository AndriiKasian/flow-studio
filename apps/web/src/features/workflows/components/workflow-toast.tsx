"use client";

import { useEffect } from "react";

const DEFAULT_TOAST_DURATION = 10_000;

interface WorkflowToastProps {
  message: string | null;
  variant: "success" | "error";
  onDismiss: () => void;
  duration?: number;
}

export function WorkflowToast({
  message,
  variant,
  onDismiss,
  duration = DEFAULT_TOAST_DURATION,
}: WorkflowToastProps) {
  useEffect(() => {
    if (!message || duration <= 0) return;

    const timeout = window.setTimeout(onDismiss, duration);

    return () => window.clearTimeout(timeout);
  }, [message, duration, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`absolute top-5 left-1/2 z-10 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${
        variant === "error"
          ? "bg-destructive/10 text-destructive border-destructive/30"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      }`}
    >
      <span>{message}</span>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer text-lg leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}