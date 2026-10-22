"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeField, NodeFieldsLayout } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.llm;

export function LlmNode({
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
      <NodeFieldsLayout>
        <NodeField
          nodeId={id}
          name="systemPrompt"
          label="System instructions"
          value={
            typeof data.systemPrompt === "string"
              ? data.systemPrompt
              : ""
          }
          placeholder="You are a helpful assistant..."
          multiline
          rows={5}
        />
      </NodeFieldsLayout>

      <NodeHandle id="prompt" type="target" />
      <NodeHandle id="response" type="source" />
    </NodeWrapper>
  );
}
