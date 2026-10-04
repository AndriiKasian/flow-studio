import express from "express";
import { flowRouter } from "./flows/flow.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(express.json());

app.use("/flows", flowRouter);

app.use(errorHandler);