"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeField } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.promptTemplate;

export function PromptTemplateNode({
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
        name="template"
        label="Prompt template"
        value={
          typeof data.template === "string"
            ? data.template
            : ""
        }
        placeholder={"Summarize the following:\n{{input}}"}
        multiline
        rows={5}
      />

      <NodeHandle id="input" type="target" />
      <NodeHandle id="prompt" type="source" />
    </NodeWrapper>
  );
}