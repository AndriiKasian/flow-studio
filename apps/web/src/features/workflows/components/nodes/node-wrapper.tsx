import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

interface NodeWrapperProps {
  title: string;
  category: string;
  icon: LucideIcon;
  selected?: boolean;
  children: ReactNode;
}

export function NodeWrapper({
  title,
  category,
  icon: Icon,
  selected = false,
  children,
}: NodeWrapperProps) {
  return (
    <div
      data-node-category={category}
      data-selected={selected}
      className="workflow-node relative w-72 rounded-xl border text-card-foreground"
    >
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className="workflow-node-icon flex size-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--node-color)_12%,transparent)] text-[var(--node-color)]">
          <Icon className="size-4" />
        </div>

        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">
            {category.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

interface NodeHandleProps {
  id: string;
  type: "source" | "target";
}

export function NodeHandle({ id, type }: NodeHandleProps) {
  return (
    <Handle
      id={id}
      type={type}
      position={type === "target" ? Position.Left : Position.Right}
      className="!size-3 !border-2 !border-background !bg-[var(--node-color)]"
    />
  );
}