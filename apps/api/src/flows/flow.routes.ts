import { Router } from "express";
import {
  createFlowController,
  getFlowsController,
} from "./flow.controller.js";

export const flowRouter = Router();

flowRouter.post("/", createFlowController);
flowRouter.get("/", getFlowsController);