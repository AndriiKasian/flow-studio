"use client";

import { Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.webSearch;

export function WebSearchNode({ data, selected }: NodeProps) {
  // The query comes from the connected input; `data.query` is only a
  // display projection supplied by the canvas, never persisted config.
  const query = typeof data.query === "string" ? data.query : "";

  return (
    <NodeWrapper
      title={definition.label}
      category={definition.category}
      icon={definition.icon}
      selected={selected}
    >
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs font-medium">
          Search query
        </span>

        <div className="workflow-node-field nodrag nowheel whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {query || (
            <span className="text-muted-foreground">
              Provided by the connected input
            </span>
          )}
        </div>
      </div>

      <NodeHandle id="query" type="target" position={Position.Top} />
      <NodeHandle id="results" type="source" />
    </NodeWrapper>
  );
}
