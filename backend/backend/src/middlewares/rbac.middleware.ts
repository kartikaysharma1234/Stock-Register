import { NextFunction, Request, Response } from "express";
import { Permission } from "../constants";
import { ApiError } from "../utils/api-error";

export const requirePermissions =
  (...permissions: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    const granted = new Set(req.user.permissions);
    if (!permissions.every((permission) => granted.has(permission))) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }
    return next();
  };

export const checkPermission = (permission: Permission) =>
  requirePermissions(permission);
