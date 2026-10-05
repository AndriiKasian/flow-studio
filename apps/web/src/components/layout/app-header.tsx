import { Workflow } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="from-brand to-brand-secondary text-brand-foreground flex size-9 items-center justify-center rounded-lg bg-linear-to-br shadow-sm">
            <Workflow className="size-5" />
          </div>

          <span className="text-lg font-semibold tracking-tight">
            AI Flow Studio
          </span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}