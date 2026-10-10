
"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import {
  workflowGraphSchema,
  type Flow,
  type WorkflowGraph,
} from "@flow-studio/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { saveWorkflowGraph } from "../actions/save-workflow-graph";
import {
  exportWorkflowToFile,
  importWorkflowFromFile,
} from "../lib/workflow-file";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorHeader } from "./workflow-editor-header";
import { WorkflowEditorSidebar } from "./workflow-editor-sidebar";
import { WorkflowToast } from "./workflow-toast";

interface WorkflowEditorProps {
  flow: Flow;
}

function WorkflowEditorContent({ flow }: WorkflowEditorProps) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } =
    useReactFlow();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<
    "success" | "error"
  >("success");

  const [pendingImport, setPendingImport] =
    useState<WorkflowGraph | null>(null);

  const dismissMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const handleSave = async () => {
    if (isSaving) return;

    setMessage(null);

    const result = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!result.success) {
      setMessageVariant("error");
      setMessage("Invalid workflow graph");
      return;
    }

    setIsSaving(true);

    try {
      const response = await saveWorkflowGraph(flow.id, result.data);

      if (!response.success) {
        setMessageVariant("error");
        setMessage(response.error);
        return;
      }

      setMessageVariant("success");
      setMessage("Workflow saved successfully");
    } catch {
      setMessageVariant("error");
      setMessage("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const result = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!result.success) {
      setMessageVariant("error");
      setMessage("Cannot export an invalid workflow graph");
      return;
    }

    exportWorkflowToFile(result.data, `workflow-${flow.id}.json`);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setMessage(null);

    try {
      const graph = await importWorkflowFromFile(file);
      setPendingImport(graph);
    } catch (error) {
      setMessageVariant("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to import workflow",
      );
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;

    setNodes(pendingImport.nodes);
    setEdges(pendingImport.edges);
    setPendingImport(null);

    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 300 });
    });

    setMessageVariant("success");
    setMessage(
      "Workflow imported successfully. Click Save to persist.",
    );
  };

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader
        flow={flow}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        isSaving={isSaving}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import workflow JSON"
        onChange={handleImportFileChange}
      />

      <div className="flex min-h-0 flex-1">
        <WorkflowEditorSidebar />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <WorkflowCanvas initialGraph={flow.graph} />
        </main>
      </div>

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingImport(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Replace current workflow?</DialogTitle>
            <DialogDescription>
              Importing this file will replace all nodes and
              connections on the canvas. Unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingImport(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleConfirmImport}
              className="cursor-pointer"
            >
              Import workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowToast
        message={message}
        variant={messageVariant}
        onDismiss={dismissMessage}
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
