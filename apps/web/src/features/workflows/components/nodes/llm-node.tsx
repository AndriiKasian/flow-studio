"use client";

import type { NodeProps } from "@xyflow/react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import {
  NodeField,
  NodeFieldsLayout,
  NodeSelect,
} from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.llm;

const modelOptions = [
  { label: "Claude Sonnet", value: "claude-sonnet" },
  { label: "Claude Haiku", value: "claude-haiku" },
  { label: "GPT", value: "openai-gpt" },
];

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
        <NodeSelect
          nodeId={id}
          name="model"
          label="Model"
          value={
            typeof data.model === "string"
              ? data.model
              : "claude-sonnet"
          }
          options={modelOptions}
        />

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
          rows={3}
        />

        <NodeField
          nodeId={id}
          name="temperature"
          label="Temperature"
          value={
            typeof data.temperature === "number"
              ? data.temperature
              : 0.7
          }
          type="number"
          min={0}
          max={2}
          step={0.1}
        />
      </NodeFieldsLayout>

      <NodeHandle id="prompt" type="target" />
      <NodeHandle id="response" type="source" />
    </NodeWrapper>
  );
}