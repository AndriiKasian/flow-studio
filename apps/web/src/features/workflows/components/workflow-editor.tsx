"use client";

import { ReactFlowProvider } from "@xyflow/react";
import type { Flow } from "@flow-studio/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWorkflowEditorExecution } from "../hooks/use-workflow-editor-execution";
import { useWorkflowFileActions } from "../hooks/use-workflow-file-actions";
import { useWorkflowToast } from "../hooks/use-workflow-toast";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorHeader } from "./workflow-editor-header";
import { WorkflowEditorSidebar } from "./workflow-editor-sidebar";
import { WorkflowToast } from "./workflow-toast";

interface WorkflowEditorProps {
  flow: Flow;
}

function WorkflowEditorContent({ flow }: WorkflowEditorProps) {
  const {
    message,
    variant,
    clearMessage,
    showSuccess,
    showError,
  } = useWorkflowToast();

  const {
    executionState,
    isRunning,
    handleRun,
    resetExecution,
  } = useWorkflowEditorExecution({
    flowId: flow.id,
    onSuccess: showSuccess,
    onError: showError,
    onStart: clearMessage,
  });

  const {
    isSaving,
    pendingImport,
    setPendingImport,
    fileInputRef,
    handleSave,
    handleExport,
    handleImport,
    handleImportFileChange,
    handleConfirmImport,
  } = useWorkflowFileActions({
    flowId: flow.id,
    onSuccess: showSuccess,
    onError: showError,
    onStart: clearMessage,
    onGraphImported: resetExecution,
  });

  const handleClearExecution = () => {
    if (isRunning) return;

    resetExecution();
    clearMessage();
  };

  return (
    <div className="workflow-editor relative flex h-screen flex-col overflow-hidden">
      <WorkflowEditorHeader
        flow={flow}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onRun={handleRun}
        onClearExecution={handleClearExecution}
        isSaving={isSaving}
        isRunning={isRunning}
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
          <WorkflowCanvas
            initialGraph={flow.graph}
            executionState={executionState}
          />
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
        variant={variant}
        onDismiss={clearMessage}
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
