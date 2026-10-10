
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { NODE_DEFINITIONS } from "../lib/node-definitions";
import { NODE_DRAG_TYPE } from "../lib/workflow-canvas-config";

const categoryLabels = {
  input: "Input",
  ai: "AI",
  transform: "Transform",
  output: "Output",
} as const;

const nodeEntries = Object.entries(NODE_DEFINITIONS);

export function WorkflowEditorSidebar() {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filteredNodes = nodeEntries.filter(([, node]) =>
    `${node.label} ${node.description}`.toLowerCase().includes(query),
  );

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
      <div className="border-sidebar-border border-b px-5 py-4">
        <h2 className="font-semibold">Nodes</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Add nodes to your workflow.
        </p>
      </div>

      <div className="border-sidebar-border border-b p-4">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />

          <Input
            type="search"
            placeholder="Search nodes..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {Object.entries(categoryLabels).map(([category, label]) => {
          const nodes = filteredNodes.filter(
            ([, node]) => node.category === category,
          );

          if (nodes.length === 0) {
            return null;
          }

          return (
            <section key={category} className="mb-5">
              <h3 className="text-muted-foreground mb-2 px-2 text-xs font-semibold uppercase tracking-wide">
                {label}
              </h3>

              <div className="space-y-1">
                {nodes.map(([type, node]) => {
                  const Icon = node.icon;

                  return (
                    <div
                      key={type}
                      data-node-category={node.category}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          NODE_DRAG_TYPE,
                          type,
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className="group flex cursor-grab items-start gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:bg-accent/50 active:cursor-grabbing"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_12%,transparent)] text-[var(--node-color)]">
                        <Icon className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {node.label}
                        </div>

                        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                          {node.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filteredNodes.length === 0 && (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm">
            No nodes found.
          </p>
        )}
      </div>
    </aside>
  );
}
