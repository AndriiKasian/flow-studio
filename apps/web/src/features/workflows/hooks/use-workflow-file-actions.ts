"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  workflowGraphSchema,
  type WorkflowGraph,
} from "@flow-studio/shared";

import { saveWorkflowGraph } from "../actions/save-workflow-graph";
import {
  exportWorkflowToFile,
  importWorkflowFromFile,
} from "../lib/workflow-file";

interface UseWorkflowFileActionsOptions {
  flowId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
  onGraphImported: () => void;
}

export function useWorkflowFileActions({
  flowId,
  onSuccess,
  onError,
  onStart,
  onGraphImported,
}: UseWorkflowFileActionsOptions) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } =
    useReactFlow();

  const [isSaving, setIsSaving] = useState(false);
  const [pendingImport, setPendingImport] =
    useState<WorkflowGraph | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    onStart();

    const result = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!result.success) {
      onError("Invalid workflow graph");
      return;
    }

    setIsSaving(true);

    try {
      const response = await saveWorkflowGraph(flowId, result.data);

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
    const result = workflowGraphSchema.safeParse({
      nodes: getNodes(),
      edges: getEdges(),
    });

    if (!result.success) {
      onError("Cannot export an invalid workflow graph");
      return;
    }

    exportWorkflowToFile(result.data, `workflow-${flowId}.json`);
  }, [getNodes, getEdges, flowId, onError]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
    if (!pendingImport) return;

    onGraphImported();

    setNodes(pendingImport.nodes);
    setEdges(pendingImport.edges);
    setPendingImport(null);

    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 300 });
    });

    onSuccess(
      "Workflow imported successfully. Click Save to persist.",
    );
  }, [
    pendingImport,
    onGraphImported,
    setNodes,
    setEdges,
    fitView,
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
