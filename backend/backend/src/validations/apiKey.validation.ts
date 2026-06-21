import { z } from "zod";
import { ApiKeyStatus, Permission, SortOrder } from "../constants";
import { dateString, objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const booleanIpLike = /^[0-9a-fA-F:.]+(?:\/\d{1,3})?$/;

const ipAllowEntry = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(booleanIpLike, "Invalid IP allow-list entry");

const futureDate = dateString
  .transform((value) => new Date(value))
  .refine((value) => value > new Date(), {
    message: "expiresAt must be in the future",
  });

export const apiKeyListValidation = z.object({
  query: paginationQuery.extend({
    organizationId: objectId.optional(),
    search: z.string().trim().max(120).optional(),
    status: z.preprocess(lowerString, z.nativeEnum(ApiKeyStatus)).optional(),
    sortBy: z.string().trim().min(1).max(80).optional(),
    sortOrder: z
      .preprocess(lowerString, z.nativeEnum(SortOrder))
      .default(SortOrder.DESC),
  }),
});

export const apiKeyCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional(),
    scopes: z.array(z.nativeEnum(Permission)).min(1).max(200),
    allowedIps: z.array(ipAllowEntry).max(50).default([]),
    expiresAt: futureDate.optional(),
  }),
});

export const apiKeyUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      scopes: z.array(z.nativeEnum(Permission)).min(1).max(200).optional(),
      allowedIps: z.array(ipAllowEntry).max(50).optional(),
      expiresAt: futureDate.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
});

export const apiKeyIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
});

export const apiKeyRevokeValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

export const apiKeyUsageValidation = z.object({
  params: z.object({ id: objectId }),
  query: paginationQuery.extend({
    organizationId: objectId.optional(),
  }),
});
