"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.jsonOutput;

export function JsonOutputNode({
  data,
  selected,
}: NodeProps) {
  const result = data.result;

  let formattedResult = "";

  if (result !== undefined && result !== null) {
    if (typeof result === "string") {
      try {
        formattedResult = JSON.stringify(
          JSON.parse(result),
          null,
          2,
        );
      } catch {
        formattedResult = result;
      }
    } else {
      formattedResult =
        JSON.stringify(result, null, 2) ?? "";
    }
  }

  return (
    <NodeWrapper
      title={definition.label}
      category={definition.category}
      icon={definition.icon}
      selected={selected}
    >
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs font-medium">
          JSON Output
        </span>

        <div className="workflow-node-field nodrag nowheel h-36 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-xs">
          {formattedResult || (
            <span className="text-muted-foreground">
              JSON output will appear here...
            </span>
          )}
        </div>
      </div>

      <NodeHandle id="input" type="target" />
    </NodeWrapper>
  );
}
