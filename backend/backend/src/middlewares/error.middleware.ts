import { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { AppError, ApiError } from "../utils/api-error";
import { logger } from "../utils/logger";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      data: error.details ?? null,
    });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    res.status(422).json({
      success: false,
      message: error.message,
      data: null,
    });
    return;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    res.status(409).json({
      success: false,
      message: "A record with this value already exists",
      data: null,
    });
    return;
  }
  logger.error("Unhandled request error", { error });
  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null,
  });
};
