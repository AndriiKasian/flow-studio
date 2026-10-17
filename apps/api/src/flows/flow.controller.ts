import type { Request, Response } from "express";
import { z } from "zod";
import {
  createFlowSchema,
  updateFlowSchema,
  workflowGraphSchema,
  normalizeWorkflowGraph,
  type WorkflowExecutionEvent,
} from "@flow-studio/shared";

import { executeWorkflow } from "../execution/execute-workflow.js";
import {
  createFlow,
  deleteFlow,
  getFlowById,
  getFlows,
  updateFlow,
  saveFlowGraph,
} from "./flow.service.js";

export async function createFlowController(req: Request, res: Response) {
  const result = createFlowSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: z.treeifyError(result.error),
    });
  }

  const flow = await createFlow(result.data);

  return res.status(201).json(flow);
}

export async function getFlowsController(_req: Request, res: Response) {
  const flows = await getFlows();

  return res.status(200).json(flows);
}

export async function getFlowByIdController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const { id } = req.params;

  const flow = await getFlowById(id);

  if (!flow) {
    res.status(404).json({
      error: "Flow not found",
    });
    return;
  }

  const graph = flow.graph === null ? null : normalizeWorkflowGraph(flow.graph);

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

  const flow = await updateFlow(req.params.id, result.data);

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

  const flow = await saveFlowGraph(req.params.id, result.data);

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

  const result = await executeWorkflow(graph);

  res.status(200).json(result);
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

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.flushHeaders();

  let disconnected = false;

  res.on("close", () => {
    disconnected = true;
  });

  const sendEvent = (event: WorkflowExecutionEvent) => {
    if (disconnected || res.destroyed) {
      return;
    }

    res.write(
      `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
    );
  };

  try {
    await executeWorkflow(graph.data, sendEvent);
  } catch (error) {
    sendEvent({
      type: "flow:stop",
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "Unknown execution error",
    });
  } finally {
    if (!disconnected && !res.writableEnded) {
      res.end();
    }
  }
}
