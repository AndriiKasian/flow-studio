"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
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

  // Keep the latest execution state available to async callbacks.
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const applyImportedGraph = useCallback(
    (graph: WorkflowGraph) => {
      onGraphImported(graph);

      setNodes(graph.nodes);
      setEdges(graph.edges);
      setPendingImport(null);

      onSuccess(
        "Workflow imported successfully. Click Save to persist.",
      );
    },
    [onGraphImported, setNodes, setEdges, onSuccess],
  );

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
    if (isRunningRef.current) return;

    fileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file) return;

      if (isRunningRef.current) {
        onError("Cannot import while a workflow is running.");
        return;
      }

      onStart();

      try {
        const graph = await importWorkflowFromFile(file);

        // Execution may have started while the file was loading.
        if (isRunningRef.current) {
          onError("Cannot import while a workflow is running.");
          return;
        }

        const isCanvasEmpty =
          getNodes().length === 0 && getEdges().length === 0;

        if (isCanvasEmpty) {
          applyImportedGraph(graph);
        } else {
          setPendingImport(graph);
        }
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Failed to import workflow",
        );
      }
    },
    [onStart, onError, getNodes, getEdges, applyImportedGraph],
  );

  const handleConfirmImport = useCallback(() => {
    if (!pendingImport || isRunningRef.current) return;

    applyImportedGraph(pendingImport);
  }, [pendingImport, applyImportedGraph]);

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
