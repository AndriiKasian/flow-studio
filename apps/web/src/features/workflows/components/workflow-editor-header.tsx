import type { Flow } from "@flow-studio/shared";
import { ArrowLeft, Workflow } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";

interface WorkflowEditorHeaderProps {
  flow: Flow;
}

export function WorkflowEditorHeader({
  flow,
}: WorkflowEditorHeaderProps) {
  return (
    <header className="border-border/60 bg-background/95 flex h-16 shrink-0 items-center border-b backdrop-blur">
      <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r px-5">
        <Link
          href="/"
          aria-label="Back to workflows"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="from-brand to-brand-secondary text-brand-foreground flex size-8 items-center justify-center rounded-lg bg-linear-to-br">
          <Workflow className="size-4" />
        </div>

        <span className="font-semibold tracking-tight">
          AI Flow Studio
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between px-5">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {flow.name}
          </p>

          <p className="text-muted-foreground text-xs">
            Workflow editor
          </p>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}