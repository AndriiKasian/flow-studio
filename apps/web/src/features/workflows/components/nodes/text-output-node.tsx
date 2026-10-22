"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.textOutput;

export function TextOutputNode({
  data,
  selected,
}: NodeProps) {
  const result =
    typeof data.result === "string"
      ? data.result
      : "";

  return (
    <NodeWrapper
      title={definition.label}
      category={definition.category}
      icon={definition.icon}
      selected={selected}
    >
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs font-medium">
          Output
        </span>

        <div className="workflow-node-field nodrag nopan nowheel pointer-events-auto h-36 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {result || (
            <span className="text-muted-foreground">
              Output will appear here...
            </span>
          )}
        </div>
      </div>

      <NodeHandle id="input" type="target" />
    </NodeWrapper>
  );
}
