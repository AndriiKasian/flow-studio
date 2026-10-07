import type { Flow } from "@flow-studio/shared";
import { ArrowRight, Workflow } from "lucide-react";
import Link from "next/link";

import { WorkflowActions } from "./workflow-actions";

interface WorkflowCardProps {
  flow: Flow;
}

export function WorkflowCard({ flow }: WorkflowCardProps) {
  const workflowHref = `/workflows/${flow.id}`;

  return (
    <article className="group bg-card text-card-foreground hover:border-brand/30 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between">
        <div className="from-brand/15 to-brand-secondary/15 text-brand flex size-10 items-center justify-center rounded-lg bg-linear-to-br">
          <Workflow className="size-5" />
        </div>

        <WorkflowActions flow={flow} />
      </div>

      <h2 className="font-semibold tracking-tight">
        <Link
          href={workflowHref}
          className="transition-colors hover:text-brand"
        >
          {flow.name}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {flow.description ?? "No description"}
      </p>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Updated{" "}
          {new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(flow.updatedAt))}
        </span>

        <Link
          href={workflowHref}
          aria-label={`Open ${flow.name}`}
          className="text-muted-foreground transition-colors hover:text-brand"
        >
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}