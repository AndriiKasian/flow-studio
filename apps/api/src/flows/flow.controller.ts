import type { Request, Response } from "express";
import { z } from "zod";
import {
  createFlowSchema,
  updateFlowSchema,
  workflowGraphSchema,
  normalizeWorkflowGraph,
  type WorkflowExecutionEvent,
  type WorkflowGraph,
  type WorkflowNodeType,
} from "@flow-studio/shared";

import { executeWorkflow } from "../execution/execute-workflow.js";
import { isLocalEnvironment } from "../lib/environment.js";
import { logError } from "../lib/error-diagnostics.js";
import {
  createFlow,
  deleteFlow,
  getFlowById,
  getFlows,
  updateFlow,
  saveFlowGraph,
} from "./flow.service.js";

const MAX_PUBLIC_EXECUTIONS = 3;
const PUBLIC_EXECUTION_TIMEOUT_MS = 10_000;

let activePublicExecutions = 0;

function acquireExecutionSlot(): (() => void) | null {
  if (activePublicExecutions >= MAX_PUBLIC_EXECUTIONS) {
    return null;
  }

  activePublicExecutions++;

  let released = false;

  return () => {
    if (released) return;

    released = true;
    activePublicExecutions--;
  };
}

function startExecutionTimeout(controller: AbortController) {
  const timeout = setTimeout(() => {
    controller.abort();
  }, PUBLIC_EXECUTION_TIMEOUT_MS);

  return () => clearTimeout(timeout);
}

function sendExecutionBusy(res: Response) {
  res.status(503).json({
    error: "Too many concurrent workflow executions.",
  });
}

export async function createFlowController(
  req: Request,
  res: Response,
) {
  const result = createFlowSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: z.treeifyError(result.error),
    });
  }

  const flow = await createFlow(result.data);

  if (!flow) {
    return res.status(409).json({
      error: "Workflow limit reached (10).",
    });
  }

  return res.status(201).json(flow);
}

export async function getFlowsController(
  _req: Request,
  res: Response,
) {
  const flows = await getFlows();

  return res.status(200).json(flows);
}

export async function getFlowByIdController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const flow = await getFlowById(req.params.id);

  if (!flow) {
    res.status(404).json({
      error: "Flow not found",
    });
    return;
  }

  const graph =
    flow.graph === null
      ? null
      : normalizeWorkflowGraph(flow.graph);

  if (flow.graph !== null && graph === null) {
    res.status(500).json({
      error: "Stored workflow graph is invalid",
    });
    return;
  }

  res.status(200).json({ ...flow, graph });
}

export async function updateFlowController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const result = updateFlowSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid request",
      details: z.treeifyError(result.error),
    });
    return;
  }

  const flow = await updateFlow(
    req.params.id,
    result.data,
  );

  res.status(200).json(flow);
}

export async function deleteFlowController(
  req: Request<{ id: string }>,
  res: Response,
) {
  await deleteFlow(req.params.id);

  res.status(204).send();
}

export async function saveFlowGraphController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const body: unknown = req.body;
  const result = workflowGraphSchema.safeParse(body);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid workflow graph",
      details: z.treeifyError(result.error),
    });
    return;
  }

  if (
    !isLocalEnvironment() &&
    !isSafePublicGraph(result.data)
  ) {
    res.status(400).json({
      error: "Unsupported nodes or graph size.",
    });
    return;
  }

  const flow = await saveFlowGraph(
    req.params.id,
    result.data,
  );

  res.json(flow);
}

export async function executeFlowController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const flow = await getFlowById(req.params.id);

  if (!flow) {
    res.status(404).json({
      error: "Flow not found",
    });
    return;
  }

  const graph = normalizeWorkflowGraph(flow.graph);

  if (!graph) {
    res.status(400).json({
      error: "Invalid workflow graph",
    });
    return;
  }

  if (containsDisabledPaidNodes(graph)) {
    sendPaidNodesDisabled(res);
    return;
  }

  if (
    !isLocalEnvironment() &&
    !isSafePublicGraph(graph)
  ) {
    res.status(400).json({
      error: "Unsupported nodes or graph size.",
    });
    return;
  }

  const releaseSlot = acquireExecutionSlot();

  if (!releaseSlot) {
    sendExecutionBusy(res);
    return;
  }

  const controller = new AbortController();
  const clearExecutionTimeout =
    startExecutionTimeout(controller);

  try {
    const result = await executeWorkflow(
      graph,
      undefined,
      controller.signal,
    );

    if (controller.signal.aborted) {
      res.status(504).json({
        error: "Workflow execution timed out.",
      });
      return;
    }

    res.status(200).json(result);
  } finally {
    clearExecutionTimeout();
    releaseSlot();
  }
}

export async function executeFlowStreamController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const flow = await getFlowById(req.params.id);

  if (!flow) {
    res.status(404).json({
      error: "Flow not found",
    });
    return;
  }

  const body: unknown = req.body;
  const graph = workflowGraphSchema.safeParse(body);

  if (!graph.success) {
    res.status(400).json({
      error: "Invalid workflow graph",
      details: z.treeifyError(graph.error),
    });
    return;
  }

  if (containsDisabledPaidNodes(graph.data)) {
    sendPaidNodesDisabled(res);
    return;
  }

  if (
    !isLocalEnvironment() &&
    !isSafePublicGraph(graph.data)
  ) {
    res.status(400).json({
      error: "Unsupported nodes or graph size.",
    });
    return;
  }

  const releaseSlot = acquireExecutionSlot();

  if (!releaseSlot) {
    sendExecutionBusy(res);
    return;
  }

  const controller = new AbortController();
  const clearExecutionTimeout =
    startExecutionTimeout(controller);

  let disconnected = false;

  const handleClose = () => {
    if (!res.writableEnded) {
      disconnected = true;
      controller.abort();
    }
  };

  res.on("close", handleClose);

  const sendEvent = (event: WorkflowExecutionEvent) => {
    if (
      disconnected ||
      res.destroyed ||
      res.writableEnded
    ) {
      return;
    }

    res.write(
      `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
    );
  };

  try {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders();

    await executeWorkflow(
      graph.data,
      sendEvent,
      controller.signal,
    );
  } catch (error) {
    logError("Workflow stream execution failed", error);

    if (!disconnected) {
      sendEvent({
        type: "flow:stop",
        status: "failed",
        error: controller.signal.aborted
          ? "Workflow execution cancelled or timed out"
          : "Workflow execution failed",
      });
    }
  } finally {
    clearExecutionTimeout();
    releaseSlot();
    res.off("close", handleClose);

    if (!disconnected && !res.writableEnded) {
      res.end();
    }
  }
}

// Paid provider nodes are disabled for flow execution unless explicitly
// enabled, so a missing or misconfigured NODE_ENV cannot expose them. The
// public demo runs its own fixed workflow and is not affected.
const PAID_NODE_TYPES = new Set<WorkflowNodeType>(["llm", "webSearch"]);

function containsDisabledPaidNodes(graph: WorkflowGraph): boolean {
  return (
    process.env.ALLOW_PAID_FLOW_NODES !== "true" &&
    graph.nodes.some((node) => PAID_NODE_TYPES.has(node.type))
  );
}

function sendPaidNodesDisabled(res: Response) {
  res.status(400).json({
    error: "LLM and Web Search nodes are disabled for workflow execution.",
  });
}

// Production sandbox: deterministic, free nodes only.
const PUBLIC_NODE_TYPES = new Set([
  "textInput",
  "promptTemplate",
  "textTransform",
  "textOutput",
  "jsonOutput",
]);

function isSafePublicGraph(
  graph: WorkflowGraph,
): boolean {
  return (
    graph.nodes.length <= 30 &&
    graph.edges.length <= 60 &&
    graph.nodes.every((node) =>
      PUBLIC_NODE_TYPES.has(node.type),
    ) &&
    JSON.stringify(graph).length <= 12_000
  );
}
