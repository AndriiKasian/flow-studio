import { rateLimit } from "express-rate-limit";

import { Router } from "express";

import { isLocalEnvironment } from "../lib/environment.js";
import { clientIpRateLimitKey } from "../lib/trusted-proxy.js";
import {
  createFlowController,
  deleteFlowController,
  executeFlowController,
  executeFlowStreamController,
  getFlowByIdController,
  getFlowsController,
  saveFlowGraphController,
  updateFlowController,
} from "./flow.controller.js";

export const flowRouter = Router();

// Limit public mutations and executions per visitor; GET remains unrestricted.
const publicWriteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: clientIpRateLimitKey,
});
flowRouter.use((req, res, next) => {
  if (isLocalEnvironment() || req.method === "GET") {
    next();
    return;
  }
  publicWriteLimit(req, res, next);
});

flowRouter.post("/", createFlowController);
flowRouter.get("/", getFlowsController);
flowRouter.get("/:id", getFlowByIdController);
flowRouter.patch("/:id", updateFlowController);
flowRouter.put("/:id/graph", saveFlowGraphController);
flowRouter.post("/:id/execute", executeFlowController);
flowRouter.post("/:id/execute/stream", executeFlowStreamController);
flowRouter.delete("/:id", deleteFlowController);
