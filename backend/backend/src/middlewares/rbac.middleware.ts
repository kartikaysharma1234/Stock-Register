import { NextFunction, Request, Response } from "express";
import { Permission, ROLE_PERMISSIONS } from "../constants/permissions";
import { ApiError } from "../utils/api-error";

export const requirePermissions =
  (...permissions: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    const granted = ROLE_PERMISSIONS[req.user.role] ?? [];
    if (!permissions.every((permission) => granted.includes(permission))) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }
    return next();
  };
