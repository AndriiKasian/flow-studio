import type { Request, Response } from "express";
import { z } from "zod";
import { createFlowSchema } from "@flow-studio/shared";
import { createFlow, getFlows } from "./flow.service.js";

export async function createFlowController(req: Request, res: Response) {
  const result = createFlowSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: z.treeifyError(result.error),
    });
  }

  const flow = await createFlow(result.data.name);

  return res.status(201).json(flow);
}

export async function getFlowsController(_req: Request, res: Response) {
  const flows = await getFlows();

  return res.status(200).json(flows);
}