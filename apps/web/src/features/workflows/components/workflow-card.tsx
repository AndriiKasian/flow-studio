import type { Flow } from "@flow-studio/shared";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";

import { BackendStatusBadge, type BackendStatus } from "./backend-status";
import { WorkflowActions } from "./workflow-actions";

type WorkflowCardProps =
  | {
      variant: "demo";
      flow?: never;
      status: BackendStatus;
    }
  | {
      variant?: "default";
      flow: Flow;
      status: BackendStatus;
    };

export function WorkflowCard(props: WorkflowCardProps) {
  const isDemo = props.variant === "demo";

  const name = isDemo ? "AI Research Demo" : props.flow.name;

  const description = isDemo
    ? "Explore a live AI workflow powered by web search and a language model."
    : (props.flow.description ?? "No description");

  const workflowHref = isDemo
    ? "/workflows/demo"
    : `/workflows/${props.flow.id}`;

  // Workflows load from the backend, so they cannot be opened until it is
  // ready. Disabled navigation renders no link at all, so it cannot be
  // clicked, focused or activated from the keyboard.
  const canNavigate = props.status === "ready";

  return (
    <article
      className={cn(
        "group bg-card text-card-foreground rounded-xl border p-5 transition-all",
        canNavigate &&
          "hover:border-brand/30 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="from-brand/15 to-brand-secondary/15 flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br">
          <FlowStudioLogo size={24} />
        </div>

        {props.variant === "demo" ? (
          <span className="text-xs text-muted-foreground">
            Read-only demo
          </span>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-xs text-muted-foreground">
              Updated{" "}
              <time dateTime={props.flow.updatedAt}>
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(props.flow.updatedAt))}
              </time>
            </span>

            <WorkflowActions flow={props.flow} />
          </div>
        )}
      </div>

      <h2 className="font-semibold tracking-tight">
        {canNavigate ? (
          <Link
            href={workflowHref}
            className="transition-colors hover:text-brand"
          >
            {name}
          </Link>
        ) : (
          // An anchor without href is not focusable or activatable;
          // role and aria-disabled expose it as an unavailable link.
          <a role="link" aria-disabled="true">
            {name}
          </a>
        )}
      </h2>

      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {description}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <BackendStatusBadge status={props.status} />

        {canNavigate ? (
          <Link
            href={workflowHref}
            aria-label={`Open ${name}`}
            className="text-muted-foreground transition-colors hover:text-brand"
          >
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground opacity-40"
          />
        )}
      </div>
    </article>
  );
}
