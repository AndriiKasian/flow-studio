"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlowProvider,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import type { Flow, WorkflowGraph } from "@flow-studio/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { WorkflowCanvasGraph } from "../hooks/use-workflow-canvas";
import {
  createFitViewRequest,
  type FitViewRequest,
} from "../lib/fit-view-request";
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
  const { setNodes, setEdges } = useReactFlow();

  const isCanvasEmpty = useStore(
    (state) => state.nodes.length === 0 && state.edges.length === 0,
  );

  const [isClearCanvasOpen, setIsClearCanvasOpen] = useState(false);

  const {
    message,
    variant,
    clearMessage,
    showSuccess,
    showError,
  } = useWorkflowToast();

  // Synced by WorkflowCanvas, which owns the canvas state, so node drags
  // do not rerender the whole editor.
  const canvasGraphRef = useRef<WorkflowCanvasGraph>({
    nodes: [],
    edges: [],
  });

  const getCanvasGraph = useCallback(() => canvasGraphRef.current, []);

  // Consumed by WorkflowCanvas once the requested nodes have been measured.
  // An empty workflow has no request, so the first dropped node never fits.
  const [initialFitViewRequest] = useState(() =>
    createFitViewRequest(flow.graph?.nodes ?? [], false),
  );

  const fitViewRequestRef = useRef<FitViewRequest | null>(
    initialFitViewRequest,
  );

  const {
    executionState,
    isRunning,
    handleRun,
    resetExecution,
  } = useWorkflowEditorExecution({
    flowId: flow.id,
    getCanvasGraph,
    onSuccess: showSuccess,
    onError: showError,
    onStart: clearMessage,
  });

  const handleGraphImported = useCallback(
    (graph: WorkflowGraph) => {
      resetExecution();
      fitViewRequestRef.current = createFitViewRequest(graph.nodes, true);
    },
    [resetExecution],
  );

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
    onGraphImported: handleGraphImported,
    isRunning,
  });

  const handleRequestClearCanvas = () => {
    if (isRunning || isSaving || isCanvasEmpty) return;

    setIsClearCanvasOpen(true);
  };

  const handleConfirmClearCanvas = () => {
    if (isRunning || isSaving || isCanvasEmpty) return;

    setNodes([]);
    setEdges([]);
    fitViewRequestRef.current = null;
    resetExecution();
    clearMessage();

    setIsClearCanvasOpen(false);
    showSuccess("Canvas cleared. Click Save to persist.");
  };

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
        onClearCanvas={handleRequestClearCanvas}
        isCanvasEmpty={isCanvasEmpty}
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
            graphRef={canvasGraphRef}
            fitViewRequestRef={fitViewRequestRef}
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
              disabled={isRunning}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Import workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isClearCanvasOpen}
        onOpenChange={setIsClearCanvasOpen}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Clear the entire canvas?</DialogTitle>
            <DialogDescription>
              This removes all nodes and connections from the editor.
              Nothing is deleted from the database until you click Save.
              Reload without saving to restore the saved workflow.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClearCanvasOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmClearCanvas}
              disabled={isRunning || isSaving || isCanvasEmpty}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Clear Canvas
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
