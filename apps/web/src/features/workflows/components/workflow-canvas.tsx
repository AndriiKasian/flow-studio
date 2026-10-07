"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";

export function WorkflowCanvas() {
  const { resolvedTheme } = useTheme();

  const colorMode: ColorMode =
    resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ReactFlow
      nodes={[]}
      edges={[]}
      colorMode={colorMode}
      fitView
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
      />

      <Controls />
    </ReactFlow>
  );
}