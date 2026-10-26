"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function WorkflowListError() {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  function handleRetry() {
    // The Dashboard is dynamic and getFlows does not cache, so a refresh
    // re-renders the workflow list with a new API request.
    startRetry(() => {
      router.refresh();
    });
  }

  return (
    <div
      role="alert"
      className="bg-card text-card-foreground rounded-xl border p-5"
    >
      <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </div>

      <p className="font-semibold tracking-tight">Workflows unavailable</p>

      <p className="mt-2 min-h-10 text-sm text-muted-foreground">
        The server did not respond. It may still be starting up — please try
        again.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="mt-6"
        onClick={handleRetry}
        disabled={isRetrying}
      >
        <RotateCw className={isRetrying ? "animate-spin" : undefined} />
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
