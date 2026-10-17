"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import type { WorkflowGraph } from "@flow-studio/shared";

import { saveWorkflowGraph } from "../actions/save-workflow-graph";
import { prepareWorkflowGraph } from "../lib/prepare-workflow-graph";
import {
  exportWorkflowToFile,
  importWorkflowFromFile,
} from "../lib/workflow-file";

interface UseWorkflowFileActionsOptions {
  flowId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
  onGraphImported: (graph: WorkflowGraph) => void;
  isRunning: boolean;
}

export function useWorkflowFileActions({
  flowId,
  onSuccess,
  onError,
  onStart,
  onGraphImported,
  isRunning,
}: UseWorkflowFileActionsOptions) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const [isSaving, setIsSaving] = useState(false);
  const [pendingImport, setPendingImport] =
    useState<WorkflowGraph | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    onStart();

    const graph = prepareWorkflowGraph(
      getNodes(),
      getEdges(),
    );

    if (!graph) {
      onError("Invalid workflow graph");
      return;
    }

    setIsSaving(true);

    try {
      const response = await saveWorkflowGraph(flowId, graph);

      if (!response.success) {
        onError(response.error);
        return;
      }

      onSuccess("Workflow saved successfully");
    } catch {
      onError("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    onStart,
    onSuccess,
    onError,
    getNodes,
    getEdges,
    flowId,
  ]);

  const handleExport = useCallback(() => {
    const graph = prepareWorkflowGraph(
      getNodes(),
      getEdges(),
    );

    if (!graph) {
      onError("Cannot export an invalid workflow graph");
      return;
    }

    exportWorkflowToFile(graph, `workflow-${flowId}.json`);
  }, [getNodes, getEdges, flowId, onError]);

  const handleImport = useCallback(() => {
    if (isRunning) return;

    fileInputRef.current?.click();
  }, [isRunning]);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file) return;

      onStart();

      try {
        const graph = await importWorkflowFromFile(file);
        setPendingImport(graph);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Failed to import workflow",
        );
      }
    },
    [onStart, onError],
  );

  const handleConfirmImport = useCallback(() => {
    if (!pendingImport || isRunning) return;

    onGraphImported(pendingImport);

    setNodes(pendingImport.nodes);
    setEdges(pendingImport.edges);
    setPendingImport(null);

    onSuccess(
      "Workflow imported successfully. Click Save to persist.",
    );
  }, [
    pendingImport,
    isRunning,
    onGraphImported,
    setNodes,
    setEdges,
    onSuccess,
  ]);

  return {
    isSaving,
    pendingImport,
    setPendingImport,
    fileInputRef,
    handleSave,
    handleExport,
    handleImport,
    handleImportFileChange,
    handleConfirmImport,
  };
}
