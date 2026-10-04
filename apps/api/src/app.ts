import express from "express";
import { flowRouter } from "./flows/flow.routes.js";

export const app = express();

app.use(express.json());

app.use("/flows", flowRouter);