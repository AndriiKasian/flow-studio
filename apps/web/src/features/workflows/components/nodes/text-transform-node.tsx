"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeSelect } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.textTransform;

const operations = [
  { label: "Trim whitespace", value: "trim" },
  { label: "Uppercase", value: "uppercase" },
  { label: "Lowercase", value: "lowercase" },
];

export function TextTransformNode({
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
      <NodeSelect
        nodeId={id}
        name="operation"
        label="Operation"
        value={
          typeof data.operation === "string"
            ? data.operation
            : "trim"
        }
        options={operations}
      />

      <NodeHandle id="input" type="target" />
      <NodeHandle id="output" type="source" />
    </NodeWrapper>
  );
}