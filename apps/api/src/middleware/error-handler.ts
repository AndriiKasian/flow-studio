import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";

// Client errors raised by express.json() (body-parser), keyed by error type.
const bodyParserErrors: Record<string, { status: number; error: string }> = {
  "entity.parse.failed": {
    status: 400,
    error: "Malformed JSON request body",
  },
  "entity.too.large": {
    status: 413,
    error: "Request body is too large",
  },
};

function getBodyParserError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof error.type === "string" &&
    Object.hasOwn(bodyParserErrors, error.type)
  ) {
    return bodyParserErrors[error.type];
  }

  return undefined;
}

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

  const bodyParserError = getBodyParserError(error);

  if (bodyParserError) {
    res.status(bodyParserError.status).json({
      error: bodyParserError.error,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: "Internal server error",
  });
};
