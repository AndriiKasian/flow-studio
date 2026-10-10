"use client";

import { useCallback, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import {
  workflowGraphSchema,
  type Flow,
} from "@flow-studio/shared";

import { saveWorkflowGraph } from "../actions/save-workflow-graph";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorHeader } from "./workflow-editor-header";
import { WorkflowEditorSidebar } from "./workflow-editor-sidebar";
import { WorkflowToast } from "./workflow-toast";

interface WorkflowEditorProps {
  flow: Flow;
}

function WorkflowEditorContent({ flow }: WorkflowEditorProps) {
  const { getNodes, getEdges } = useReactFlow();

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveVariant, setSaveVariant] = useState<"success" | "error">(
    "success",
  );

  const dismissSaveMessage = useCallback(() => {
    setSaveMessage(null);
  }, []);

  const handleSave = async () => {
    if (isSaving) return;

    setSaveMessage(null);

    const result = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!result.success) {
      setSaveVariant("error");
      setSaveMessage("Invalid workflow graph");
      return;
    }

    setIsSaving(true);

    try {
      const response = await saveWorkflowGraph(flow.id, result.data);

      if (!response.success) {
        setSaveVariant("error");
        setSaveMessage(response.error);
        return;
      }

      setSaveVariant("success");
      setSaveMessage("Workflow saved successfully");
    } catch {
      setSaveVariant("error");
      setSaveMessage("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader
        flow={flow}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <div className="flex min-h-0 flex-1">
        <WorkflowEditorSidebar />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <WorkflowCanvas initialGraph={flow.graph} />
        </main>
      </div>

      <WorkflowToast
        message={saveMessage}
        variant={saveVariant}
        onDismiss={dismissSaveMessage}
      />
    </div>
  );
}

export function WorkflowEditor({ flow }: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent flow={flow} />
    </ReactFlowProvider>
  );
}