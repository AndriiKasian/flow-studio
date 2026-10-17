"use client";

import {
  getActivePromptTemplateInputs,
  syncPromptTemplateInputs,
  type PromptTemplateInput,
} from "@flow-studio/shared";
import {
  useNodeConnections,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";

import { NODE_DEFINITIONS } from "../../lib/node-definitions";
import { NodeField } from "./node-fields";
import { NodeHandle, NodeWrapper } from "./node-wrapper";

const definition = NODE_DEFINITIONS.promptTemplate;

function isPromptTemplateInput(
  value: unknown,
): value is PromptTemplateInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

export function PromptTemplateNode({
  id,
  data,
  selected,
}: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const template =
    typeof data.template === "string" ? data.template : "";

  // Legacy workflows may not have inputs yet; their edges use
  // variable names as targetHandle.
  const storedInputs = useMemo(
    () =>
      Array.isArray(data.inputs)
        ? data.inputs.filter(isPromptTemplateInput)
        : undefined,
    [data.inputs],
  );

  const activeInputs = useMemo(
    () => getActivePromptTemplateInputs(template, storedInputs),
    [template, storedInputs],
  );

  const connections = useNodeConnections({ handleType: "target" });

  const connectedPortIds = useMemo(
    () =>
      new Set(
        connections.flatMap((connection) =>
          connection.targetHandle ? [connection.targetHandle] : [],
        ),
      ),
    [connections],
  );

  // Removed variables keep a dimmed handle while their edge exists, so
  // the edge stays visible and deletable.
  const inactiveInputs = useMemo(
    () =>
      (storedInputs ?? []).filter(
        (input) =>
          !activeInputs.some((active) => active.id === input.id) &&
          connectedPortIds.has(input.id),
      ),
    [storedInputs, activeInputs, connectedPortIds],
  );

  const handlesKey = [...activeInputs, ...inactiveInputs]
    .map((input) => `${input.id}:${input.name}`)
    .join("\0");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handlesKey, updateNodeInternals]);

  const handleTemplateChange = useCallback(
    (nextTemplate: string) => {
      const nextInputs = syncPromptTemplateInputs(
        nextTemplate,
        storedInputs ?? activeInputs,
        connectedPortIds,
        () => crypto.randomUUID(),
      );

      updateNodeData(id, {
        template: nextTemplate,
        inputs: nextInputs,
      });
    },
    [id, storedInputs, activeInputs, connectedPortIds, updateNodeData],
  );

  const renderInput = (
    input: PromptTemplateInput,
    inactive: boolean,
  ) => (
    <div
      key={input.id}
      className="relative flex h-6 items-center pl-3"
    >
      <NodeHandle
        id={input.id}
        type="target"
        top="50%"
        left="-16px"
        inactive={inactive}
      />

      <span
        className={
          inactive
            ? "text-xs text-muted-foreground/60 line-through"
            : "text-xs text-muted-foreground"
        }
        title={
          inactive
            ? "Not used in the template. Delete the connection or add the variable back."
            : undefined
        }
      >
        {input.name}
      </span>
    </div>
  );

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
        value={template}
        placeholder={"Summarize the following:\n{{input}}"}
        multiline
        rows={5}
        onValueChange={handleTemplateChange}
      />

      {(activeInputs.length > 0 || inactiveInputs.length > 0) && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
          <div className="text-xs text-muted-foreground">
            Variables
          </div>

          {activeInputs.map((input) => renderInput(input, false))}
          {inactiveInputs.map((input) => renderInput(input, true))}
        </div>
      )}

      <NodeHandle id="prompt" type="source" />
    </NodeWrapper>
  );
}
