import { FlowStudioLogo } from "@/components/ui/flow-studio-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <FlowStudioLogo size={36} />

          <span className="text-lg font-semibold tracking-tight">
            AI Flow Studio
          </span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}