import type { Request, Response } from "express";
import { z } from "zod";
import {
  createFlowSchema,
  updateFlowSchema,
  workflowGraphSchema,
} from "@flow-studio/shared";
import { createFlow, deleteFlow, getFlowById, getFlows, updateFlow, saveFlowGraph } from "./flow.service.js";

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

  res.status(200).json(flow);
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