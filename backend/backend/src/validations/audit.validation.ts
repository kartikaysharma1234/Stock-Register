import { z } from "zod";
import { AuditModule, SortOrder } from "../constants";
import { dateString, objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const optionalDate = dateString.transform((value) => new Date(value)).optional();

const organizationQuery = {
  organizationId: objectId.optional(),
};

const sortQuery = {
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortOrder: z
    .preprocess(lowerString, z.nativeEnum(SortOrder))
    .default(SortOrder.DESC),
};

const auditBaseQuery = paginationQuery.extend({
    ...organizationQuery,
    actorId: objectId.optional(),
    performedBy: objectId.optional(),
    action: z.string().trim().max(150).optional(),
    module: z.preprocess(lowerString, z.nativeEnum(AuditModule)).optional(),
    entityType: z.string().trim().max(150).optional(),
    resourceType: z.string().trim().max(150).optional(),
    entityId: objectId.optional(),
    resourceId: objectId.optional(),
    search: z.string().trim().max(120).optional(),
    from: optionalDate,
    to: optionalDate,
    ...sortQuery,
  });

const auditFilterQuery = auditBaseQuery
  .refine(
    (query) => !query.from || !query.to || query.from <= query.to,
    "from must be before to",
  );

export const auditListValidation = z.object({
  query: auditFilterQuery,
});

export const auditExportValidation = z.object({
  query: auditBaseQuery
    .extend({
      format: z.enum(["csv", "xlsx"]).default("csv"),
    })
    .refine(
      (query) => !query.from || !query.to || query.from <= query.to,
      "from must be before to",
    ),
});

export const auditResourceHistoryValidation = z.object({
  params: z.object({ resourceId: objectId }),
  query: auditFilterQuery,
});
