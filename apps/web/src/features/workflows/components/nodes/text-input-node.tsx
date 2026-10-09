"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeField } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.textInput;

export function TextInputNode({
  id,
  data,
  selected,
}: NodeProps) {
  return (
    <NodeWrapper
      title={definition.label}
      category={definition.category}
      icon={definition.icon}
      selected={selected}
    >
      <NodeField
        nodeId={id}
        name="text"
        label="Text"
        value={typeof data.text === "string" ? data.text : ""}
        placeholder="Enter text..."
        multiline
      />

      <NodeHandle id="text" type="source" />
    </NodeWrapper>
  );
}