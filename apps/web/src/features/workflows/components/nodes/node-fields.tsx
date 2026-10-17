"use client";

import { useReactFlow } from "@xyflow/react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface NodeFieldProps {
  nodeId: string;
  name: string;
  label: string;
  value: string | number;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (nextValue: string) => void;
}

export function NodeField({
  nodeId,
  name,
  label,
  value,
  placeholder,
  multiline = false,
  rows = 3,
  type = "text",
  min,
  max,
  step,
  onValueChange,
}: NodeFieldProps) {
  const { updateNodeData } = useReactFlow();

  const updateValue = (nextValue: string) => {
    if (onValueChange) {
      onValueChange(nextValue);
      return;
    }

    if (type === "number") {
      if (nextValue === "") {
        updateNodeData(nodeId, { [name]: undefined });
        return;
      }

      const numericValue = Number(nextValue);

      if (!Number.isFinite(numericValue)) {
        return;
      }

      updateNodeData(nodeId, { [name]: numericValue });
      return;
    }

    updateNodeData(nodeId, { [name]: nextValue });
  };

  const commonProps = {
    id: `${nodeId}-${name}`,
    name,
    value,
    placeholder,
    className: "workflow-node-field nodrag nowheel",
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement
      >,
    ) => updateValue(event.target.value),
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${nodeId}-${name}`}
        className="text-muted-foreground block text-xs font-medium"
      >
        {label}
      </label>

      {multiline ? (
        <textarea
          {...commonProps}
          rows={rows}
          className={`${commonProps.className} resize-y`}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
          min={min}
          max={max}
          step={step}
        />
      )}
    </div>
  );
}

interface NodeSelectProps {
  nodeId: string;
  name: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export function NodeSelect({
  nodeId,
  name,
  label,
  value,
  options,
  placeholder = "Select an option",
}: NodeSelectProps) {
  const { updateNodeData } = useReactFlow();

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${nodeId}-${name}`}
        className="text-muted-foreground block text-xs font-medium"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={`${nodeId}-${name}`}
          name={name}
          value={value}
          onChange={(event) =>
            updateNodeData(nodeId, {
              [name]: event.target.value,
            })
          }
          className="workflow-node-field nodrag nowheel appearance-none pr-10"
        >
          <option value="" disabled>
            {placeholder}
          </option>

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          size={16}
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    </div>
  );
}

export function NodeFieldsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="space-y-4">{children}</div>;
}
