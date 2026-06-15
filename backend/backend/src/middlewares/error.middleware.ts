import { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    res.status(422).json({ message: error.message });
    return;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    res.status(409).json({ message: "A record with this value already exists" });
    return;
  }
  logger.error("Unhandled request error", { error });
  res.status(500).json({ message: "Internal server error" });
};
