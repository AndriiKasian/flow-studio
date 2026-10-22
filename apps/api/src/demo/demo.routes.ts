import { Router } from "express";

import {
  getDemoWorkflowController,
  runDemoWorkflowController,
} from "./demo.controller.js";
import { requireTrustedDemoProxy } from "./demo-proxy-guard.js";
import { demoRateLimit } from "./demo-rate-limit.js";

export const demoRouter = Router();

demoRouter.get("/workflow", getDemoWorkflowController);

demoRouter.post(
  "/run",
  requireTrustedDemoProxy,
  demoRateLimit,
  runDemoWorkflowController,
);
