import { Router } from "express";
import {
  createFlowController,
  deleteFlowController,
  executeFlowController,
  getFlowByIdController,
  getFlowsController,
  saveFlowGraphController,
  updateFlowController,
} from "./flow.controller.js";

export const flowRouter = Router();

flowRouter.post("/", createFlowController);
flowRouter.get("/", getFlowsController);
flowRouter.get("/:id", getFlowByIdController);
flowRouter.patch("/:id", updateFlowController);
flowRouter.put("/:id/graph", saveFlowGraphController);
flowRouter.post("/:id/execute", executeFlowController);
flowRouter.delete("/:id", deleteFlowController);
