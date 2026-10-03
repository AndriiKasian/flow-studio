import express from "express";
import type { HealthResponse } from "@flow-studio/shared";

const app = express();
const port = 3001;

app.get("/health", (_req, res) => {
  const response: HealthResponse = {
    status: "ok",
  };

  res.status(200).json(response);
});

app.listen(port, () => {
  console.log(`API is running on http://localhost:${port}`);
});