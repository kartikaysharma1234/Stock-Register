import { z } from "zod";
import { BudgetPeriod, RequestPriority, RequestStatus } from "../constants";
import { dateString, objectId } from "./common.validation";

const organizationQuery = {
  organizationId: objectId.optional(),
};

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const booleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const departmentFields = {
  name: z.string().trim().min(2).max(150),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(500).optional(),
  headId: objectId.nullable().optional(),
  headUserId: objectId.nullable().optional(),
  budgetAllocated: z.coerce.number().min(0).optional(),
  budgetPeriod: z.nativeEnum(BudgetPeriod).optional(),
  budgetPeriodStartedAt: dateString
    .transform((value) => new Date(value))
    .optional(),
  isActive: z.boolean().optional(),
};

export const departmentCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    ...departmentFields,
  }),
});

export const departmentUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
  body: z
    .object(departmentFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const departmentIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object(organizationQuery),
});

export const departmentListValidation = z.object({
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    isActive: booleanQuery.optional(),
    budgetPeriod: z.nativeEnum(BudgetPeriod).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "code", "budgetUsed"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const departmentRequestsValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    ...organizationQuery,
    ...pagination,
    search: z.string().trim().max(120).optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    priority: z.nativeEnum(RequestPriority).optional(),
    warehouseId: objectId.optional(),
    requestedBy: objectId.optional(),
    requiredFrom: dateString
      .transform((value) => new Date(value))
      .optional(),
    requiredTo: dateString.transform((value) => new Date(value)).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "requestNumber",
        "priority",
        "requiredByDate",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});
