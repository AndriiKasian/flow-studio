"use client";

import { cn } from "cn";
import { CircleAlert, CircleCheck, LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type BackendStatus = "connecting" | "ready" | "unavailable";

type BackendRetryContextValue = {
  isRetrying: boolean;
  retry: () => void;
};

const BackendRetryContext = createContext<BackendRetryContextValue | null>(
  null,
);

// Shares one Retry transition so every status badge on the page shows
// Connecting while the retried request is in flight.
export function BackendRetryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  function retry() {
    // Pages that load from the API are dynamic and their requests are not
    // cached, so a refresh re-renders the page with a new API request.
    startRetry(() => {
      router.refresh();
    });
  }

  return (
    <BackendRetryContext value={{ isRetrying, retry }}>
      {children}
    </BackendRetryContext>
  );
}

const statusPresentation = {
  connecting: {
    label: "Connecting",
    Icon: LoaderCircle,
    className: "text-muted-foreground",
    iconClassName: "animate-spin",
  },
  ready: {
    label: "Ready",
    Icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-400",
    iconClassName: undefined,
  },
  unavailable: {
    label: "Unavailable",
    Icon: CircleAlert,
    className: "text-destructive",
    iconClassName: undefined,
  },
} satisfies Record<BackendStatus, unknown>;

export function BackendStatusBadge({ status }: { status: BackendStatus }) {
  const isRetrying = useContext(BackendRetryContext)?.isRetrying ?? false;
  const displayStatus =
    status === "unavailable" && isRetrying ? "connecting" : status;
  const { label, Icon, className, iconClassName } =
    statusPresentation[displayStatus];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}
    >
      <Icon aria-hidden="true" className={cn("size-3.5", iconClassName)} />
      <span className="sr-only">Server status: </span>
      {label}
    </span>
  );
}

export function BackendRetryButton() {
  const context = useContext(BackendRetryContext);

  if (!context) {
    throw new Error("BackendRetryButton must be used within BackendRetryProvider");
  }

  const { isRetrying, retry } = context;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={retry}
      disabled={isRetrying}
    >
      <RotateCw className={isRetrying ? "animate-spin" : undefined} />
      {isRetrying ? "Retrying…" : "Retry"}
    </Button>
  );
}
