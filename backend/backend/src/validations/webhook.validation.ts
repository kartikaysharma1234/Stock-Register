import { z } from "zod";
import {
  SortOrder,
  WebhookDeliveryStatus,
  WebhookEvent,
} from "../constants";
import { objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const eventString = (value: unknown) =>
  typeof value === "string"
    ? value.toLowerCase().replaceAll("_", ".")
    : value;

const webhookUrl = z
  .string()
  .url()
  .max(1000)
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Webhook URL must use http or https",
  });

const headerRecord = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9-]+$/, "Invalid header name"),
    z.string().trim().min(1).max(500),
  )
  .default({});

const eventArray = z
  .array(z.preprocess(eventString, z.nativeEnum(WebhookEvent)))
  .min(1)
  .max(50)
  .superRefine((events, ctx) => {
    if (new Set(events).size !== events.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate webhook events are not allowed",
      });
    }
  });

const booleanQuery = z
  .preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean())
  .optional();

export const webhookCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(120),
    url: webhookUrl,
    description: z.string().trim().max(1000).optional(),
    events: eventArray,
    headers: headerRecord,
    isActive: z.boolean().optional(),
  }),
});

export const webhookUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      url: webhookUrl.optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      events: eventArray.optional(),
      headers: headerRecord.optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
});

export const webhookListValidation = z.object({
  query: paginationQuery.extend({
    organizationId: objectId.optional(),
    search: z.string().trim().max(120).optional(),
    event: z.preprocess(eventString, z.nativeEnum(WebhookEvent)).optional(),
    isActive: booleanQuery,
    sortBy: z.string().trim().min(1).max(80).optional(),
    sortOrder: z
      .preprocess(lowerString, z.nativeEnum(SortOrder))
      .default(SortOrder.DESC),
  }),
});

export const webhookIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
});

export const webhookDeliveryListValidation = z.object({
  params: z.object({ id: objectId }),
  query: paginationQuery.extend({
    organizationId: objectId.optional(),
    event: z.preprocess(eventString, z.nativeEnum(WebhookEvent)).optional(),
    status: z
      .preprocess(lowerString, z.nativeEnum(WebhookDeliveryStatus))
      .optional(),
  }),
});
