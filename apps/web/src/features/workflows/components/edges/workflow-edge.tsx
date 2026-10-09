"use client";

import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type WorkflowEdgeStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type WorkflowEdgeData = {
  color?: string;
  status?: WorkflowEdgeStatus;
};

export type WorkflowEdgeType = Edge<
  WorkflowEdgeData,
  "workflow"
>;

const statusColors: Record<
  Exclude<WorkflowEdgeStatus, "idle" | "running">,
  string
> = {
  completed: "#22c55e",
  failed: "#ef4444",
  skipped: "#64748b",
};

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkflowEdgeType>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const status = data?.status ?? "idle";

  const color =
    status === "idle" || status === "running"
      ? (data?.color ?? "#8b5cf6")
      : statusColors[status];

  return (
    <g
      className="workflow-edge"
      data-status={status}
      data-selected={selected}
      style={
        {
          "--edge-color": color,
        } as React.CSSProperties
      }
    >
      <path
        d={edgePath}
        className="workflow-edge-glow"
        fill="none"
      />

      <BaseEdge
        id={id}
        path={edgePath}
        className="workflow-edge-path"
      />
    </g>
  );
}