import type { Flow } from "@flow-studio/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface WorkflowEditorHeaderProps {
  flow: Flow;
  onSave: () => void;
  isSaving: boolean;
}

export function WorkflowEditorHeader({
  flow,
  onSave,
  isSaving,
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

        <FlowStudioLogo size={32} />

        <span className="font-semibold tracking-tight">
          AI Flow Studio
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between px-5">
        <div className="min-w-0">
          <p className="truncate font-medium">{flow.name}</p>

          <p className="text-muted-foreground text-xs">
            Workflow editor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <Save className="size-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}