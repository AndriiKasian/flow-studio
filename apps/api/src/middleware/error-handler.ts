import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({
      error: "Resource not found",
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: "Internal server error",
  });
};