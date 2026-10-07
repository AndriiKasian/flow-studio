import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function WorkflowEditorSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
      <div className="border-sidebar-border border-b px-5 py-4">
        <h2 className="font-semibold">
          Nodes
        </h2>

        <p className="text-muted-foreground mt-1 text-xs">
          Add nodes to your workflow.
        </p>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />

          <Input
            type="search"
            placeholder="Search nodes..."
            className="pl-9"
            disabled
          />
        </div>

        <div className="text-muted-foreground flex min-h-48 items-center justify-center px-4 text-center text-sm">
          Node library will appear here.
        </div>
      </div>
    </aside>
  );
}