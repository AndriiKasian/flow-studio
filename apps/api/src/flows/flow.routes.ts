import { Router } from "express";
import {
  createFlowController,
  deleteFlowController,
  getFlowByIdController,
  getFlowsController,
  updateFlowController,
} from "./flow.controller.js";

export const flowRouter = Router();

flowRouter.post("/", createFlowController);
flowRouter.get("/", getFlowsController);
flowRouter.get("/:id", getFlowByIdController);
flowRouter.patch("/:id", updateFlowController);
flowRouter.delete("/:id", deleteFlowController);