import { z } from "zod";
import {
  ReportFormat,
  ReportFrequency,
  ReportKind,
  SortOrder,
} from "../constants";
import { dateString, objectId, paginationQuery } from "./common.validation";

const enumString = (value: unknown) =>
  typeof value === "string"
    ? value.toLowerCase().replaceAll("_", "-")
    : value;

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const booleanQuery = z
  .preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean())
  .optional();

const rangeQuery = {
  from: dateString.transform((value) => new Date(value)),
  to: dateString.transform((value) => new Date(value)),
  warehouseId: objectId.optional(),
  departmentId: objectId.optional(),
  itemId: objectId.optional(),
  categoryId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

const validateDateOrder = (value: { from?: Date; to?: Date }) =>
  !value.from || !value.to || value.from <= value.to;

export const dateRangeValidation = z.object({
  query: z.object(rangeQuery).refine(validateDateOrder, {
    message: "from must be before to",
  }),
});

export const stockStatusReportValidation = z.object({
  query: z.object({
    warehouseId: objectId.optional(),
    itemId: objectId.optional(),
    categoryId: objectId.optional(),
    status: z
      .enum(["in_stock", "low_stock", "out_of_stock"])
      .optional(),
  }),
});

const savedFilters = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    warehouseId: objectId.optional(),
    departmentId: objectId.optional(),
    itemId: objectId.optional(),
    categoryId: objectId.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      new Date(value.from) <= new Date(value.to),
    { message: "from must be before to" },
  );

export const exportReportValidation = z.object({
  body: z.object({
    recipientEmail: z.string().email(),
    kind: z.preprocess(enumString, z.nativeEnum(ReportKind)),
    format: z.preprocess(lowerString, z.nativeEnum(ReportFormat)),
    filters: savedFilters.default({}),
  }),
});

const savedReportBody = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  kind: z.preprocess(enumString, z.nativeEnum(ReportKind)),
  filters: savedFilters.default({}),
  columns: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
  format: z
    .preprocess(lowerString, z.nativeEnum(ReportFormat))
    .default(ReportFormat.XLSX),
  frequency: z
    .preprocess(lowerString, z.nativeEnum(ReportFrequency))
    .default(ReportFrequency.NONE),
  recipients: z.array(z.string().email()).max(50).default([]),
  nextRunAt: dateString.transform((value) => new Date(value)).optional(),
  isActive: z.boolean().optional(),
});

const validateScheduleRecipients = (
  body: { frequency?: ReportFrequency; recipients?: string[] },
  ctx: z.RefinementCtx,
) => {
  if (
    body.frequency &&
    body.frequency !== ReportFrequency.NONE &&
    !body.recipients?.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipients"],
      message: "Scheduled reports require at least one recipient",
    });
  }
};

export const createSavedReportValidation = z.object({
  body: savedReportBody.superRefine(validateScheduleRecipients),
});

export const updateSavedReportValidation = z.object({
  params: z.object({ id: objectId }),
  body: savedReportBody
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    })
    .superRefine(validateScheduleRecipients),
});

export const savedReportListValidation = z.object({
  query: paginationQuery.extend({
    search: z.string().trim().max(120).optional(),
    kind: z.preprocess(enumString, z.nativeEnum(ReportKind)).optional(),
    frequency: z
      .preprocess(lowerString, z.nativeEnum(ReportFrequency))
      .optional(),
    isActive: booleanQuery,
    sortBy: z.string().trim().min(1).max(80).optional(),
    sortOrder: z
      .preprocess(lowerString, z.nativeEnum(SortOrder))
      .default(SortOrder.DESC),
  }),
});

export const savedReportIdValidation = z.object({
  params: z.object({ id: objectId }),
});
