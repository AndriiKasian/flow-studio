import type { Flow } from "@flow-studio/shared";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";

import { WorkflowActions } from "./workflow-actions";

type WorkflowCardProps =
  | {
      variant: "demo";
      flow?: never;
      // Backend readiness, shown in place of the update date.
      status: ReactNode;
    }
  | {
      variant?: "default";
      flow: Flow;
      status?: never;
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

  return (
    <article className="group bg-card text-card-foreground hover:border-brand/30 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between">
        <div className="from-brand/15 to-brand-secondary/15 flex size-10 items-center justify-center rounded-lg bg-linear-to-br">
          <FlowStudioLogo size={24} />
        </div>

        {props.variant === "demo" ? (
          <span className="text-xs text-muted-foreground">
            Read-only demo
          </span>
        ) : (
          <WorkflowActions flow={props.flow} />
        )}
      </div>

      <h2 className="font-semibold tracking-tight">
        <Link
          href={workflowHref}
          className="transition-colors hover:text-brand"
        >
          {name}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {description}
      </p>

      <div className="mt-6 flex items-center justify-between">
        {props.variant === "demo" ? (
          props.status
        ) : (
          <span className="text-xs text-muted-foreground">
            {`Updated ${new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(props.flow.updatedAt))}`}
          </span>
        )}

        <Link
          href={workflowHref}
          aria-label={`Open ${name}`}
          className="text-muted-foreground transition-colors hover:text-brand"
        >
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
