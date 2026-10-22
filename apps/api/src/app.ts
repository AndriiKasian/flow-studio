import cors from "cors";
import express from "express";

import { demoRouter } from "./demo/demo.routes.js";
import { flowRouter } from "./flows/flow.routes.js";
import { isLocalEnvironment } from "./lib/environment.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

// Trust only the nearest proxy hop. Render appends to client-supplied
// X-Forwarded-For through more than one hop, so a larger count could let
// clients choose req.ip; with one hop req.ip may be a platform proxy address.
// Rate limits key on the client IP forwarded by the trusted web proxy instead
// (see lib/trusted-proxy.ts).
app.set("trust proxy", 1);

const frontendUrl = process.env.FRONTEND_URL;

if (!isLocalEnvironment() && !frontendUrl) {
  throw new Error("FRONTEND_URL is required outside local development");
}

app.use(
  cors({
    origin: frontendUrl ?? "http://localhost:3000",
  }),
);

app.use(express.json({ limit: "16kb" }));

app.use("/api/demo", demoRouter);

app.use("/flows", flowRouter);

app.use(errorHandler);
