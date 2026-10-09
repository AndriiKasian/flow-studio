"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeField, NodeFieldsLayout } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.userInput;

export function UserInputNode({
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
          name="variableName"
          label="Variable name"
          value={
            typeof data.variableName === "string"
              ? data.variableName
              : ""
          }
          placeholder="user_message"
        />

        <NodeField
          nodeId={id}
          name="defaultValue"
          label="Default value"
          value={
            typeof data.defaultValue === "string"
              ? data.defaultValue
              : ""
          }
          placeholder="Optional default..."
          multiline
          rows={2}
        />
      </NodeFieldsLayout>

      <NodeHandle id="value" type="source" />
    </NodeWrapper>
  );
}