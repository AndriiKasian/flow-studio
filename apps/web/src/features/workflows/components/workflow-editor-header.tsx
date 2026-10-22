import type { Flow } from "@flow-studio/shared";
import {
  ArrowLeft,
  Download,
  Play,
  RotateCcw,
  Trash2,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type WorkflowEditorHeaderProps =
  | {
      variant?: "editor";
      flow: Flow;
      onSave: () => void;
      onExport: () => void;
      onImport: () => void;
      onClearCanvas: () => void;
      isSaving: boolean;
      isCanvasEmpty: boolean;
      onRun: () => void;
      onClearExecution: () => void;
      isRunning: boolean;
    }
  | {
      variant: "demo";
      flow?: never;
      onRun: () => void;
      onClearExecution: () => void;
      isRunning: boolean;
      hasExecution: boolean;
    };

export function WorkflowEditorHeader(props: WorkflowEditorHeaderProps) {
  const isDemo = props.variant === "demo";

  const title = isDemo ? "AI Research Demo" : props.flow.name;
  const subtitle = isDemo
    ? "Interactive AI workflow demo"
    : "Workflow editor";

  const isResetDisabled = props.isRunning ||
    (isDemo && !props.hasExecution);

  const isRunDisabled = props.isRunning ||
    (!isDemo && props.isSaving);

  return (
    <header className="border-border/60 bg-background/95 flex h-16 shrink-0 items-center border-b backdrop-blur">
      <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r px-5">
        <Link
          href="/"
          aria-label="Back to workflows"
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
          <p className="truncate font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {props.variant !== "demo" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={props.onImport}
                disabled={props.isRunning}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                <Upload className="size-4" />
                Import
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={props.onExport}
                className="cursor-pointer"
              >
                <Download className="size-4" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={props.onSave}
                disabled={props.isSaving}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                <Save className="size-4" />
                {props.isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={props.onClearExecution}
            disabled={isResetDisabled}
            className="cursor-pointer disabled:cursor-not-allowed"
            title="Reset execution highlights and results"
          >
            <RotateCcw className="size-4" />
            Reset Execution
          </Button>

          {props.variant !== "demo" && (
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClearCanvas}
              disabled={
                props.isRunning ||
                props.isSaving ||
                props.isCanvasEmpty
              }
              className="cursor-pointer disabled:cursor-not-allowed"
              title="Remove all nodes and connections (not saved automatically)"
            >
              <Trash2 className="size-4" />
              Clear Canvas
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={props.onRun}
            disabled={isRunDisabled}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <Play className="size-4" />
            {props.isRunning ? "Running..." : "Run"}
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
