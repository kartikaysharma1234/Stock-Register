import { Request } from "express";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";

export const actorFrom = (req: Request): AuthUser => {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
};

export const validatedBody = <T>(req: Request) =>
  (req.validated?.body ?? req.body) as T;

export const validatedParams = <T>(req: Request) =>
  (req.validated?.params ?? req.params) as T;

export const validatedQuery = <T>(req: Request) =>
  (req.validated?.query ?? req.query) as T;
