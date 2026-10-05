import type { Flow } from "@flow-studio/shared";
import { ArrowRight, Workflow } from "lucide-react";

interface WorkflowCardProps {
  flow: Flow;
}

export function WorkflowCard({ flow }: WorkflowCardProps) {
  return (
    <article className="group bg-card text-card-foreground hover:border-brand/30 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="from-brand/15 to-brand-secondary/15 text-brand mb-5 flex size-10 items-center justify-center rounded-lg bg-linear-to-br">
        <Workflow className="size-5" />
      </div>

      <h2 className="font-semibold tracking-tight">
        {flow.name}
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

        <ArrowRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand" />
      </div>
    </article>
  );
}