import { NextFunction, Request, Response } from "express";
import { Role } from "../constants";
import { ApiError } from "../utils/api-error";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const requestedIds = (
  req: Request,
  singular: string,
  plural: string,
): string[] => {
  const body = asRecord(req.validated?.body ?? req.body);
  const query = asRecord(req.validated?.query ?? req.query);
  const values = [
    body[singular],
    query[singular],
    ...(Array.isArray(body[plural]) ? body[plural] : []),
    ...(Array.isArray(query[plural]) ? query[plural] : []),
  ];
  return values.filter((value): value is string => typeof value === "string");
};

export const checkOwnership = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));

  if ([Role.SUPER_ADMIN, Role.ADMIN].includes(req.user.role)) {
    return next();
  }

  const departmentIds = requestedIds(
    req,
    "departmentId",
    "departmentIds",
  );
  const warehouseIds = requestedIds(req, "warehouseId", "warehouseIds");

  if (
    [Role.SUB_ADMIN, Role.DEPARTMENT_HEAD].includes(req.user.role) &&
    departmentIds.some((id) => !req.user?.departmentIds.includes(id))
  ) {
    return next(new ApiError(403, "Department ownership check failed"));
  }
  if (
    [Role.SUB_ADMIN, Role.STORE_MANAGER].includes(req.user.role) &&
    warehouseIds.some((id) => !req.user?.warehouseIds.includes(id))
  ) {
    return next(new ApiError(403, "Warehouse ownership check failed"));
  }
  return next();
};
