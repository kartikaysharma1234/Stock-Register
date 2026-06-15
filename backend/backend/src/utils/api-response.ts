import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
