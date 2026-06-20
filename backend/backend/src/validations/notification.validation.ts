import { z } from "zod";
import {
  NotificationChannel,
  NotificationType,
  SortOrder,
} from "../constants";
import { objectId, paginationQuery } from "./common.validation";

const lowerString = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : value;

const booleanQuery = z
  .preprocess((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean())
  .optional();

const sortQuery = {
  sortBy: z.string().trim().min(1).max(80).optional(),
  sortOrder: z
    .preprocess(lowerString, z.nativeEnum(SortOrder))
    .default(SortOrder.DESC),
};

export const notificationListValidation = z.object({
  query: paginationQuery.extend({
    unreadOnly: booleanQuery,
    type: z.preprocess(lowerString, z.nativeEnum(NotificationType)).optional(),
    search: z.string().trim().max(120).optional(),
    ...sortQuery,
  }),
});

export const notificationIdValidation = z.object({
  params: z.object({ id: objectId }),
});

export const notificationPreferenceValidation = z.object({
  body: z
    .object({
      preferences: z
        .array(
          z.object({
            type: z.preprocess(lowerString, z.nativeEnum(NotificationType)),
            channels: z
              .array(
                z.preprocess(
                  lowerString,
                  z.nativeEnum(NotificationChannel),
                ),
              )
              .min(1),
          }),
        )
        .min(1),
    })
    .superRefine((body, ctx) => {
      const keys = body.preferences.map((entry) => entry.type);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate notification preference types are not allowed",
        });
      }
    }),
});
