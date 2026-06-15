import { z } from "zod";
import { dateString, objectId } from "./common.validation";

export const dateRangeValidation = z.object({
  query: z
    .object({
      from: dateString.transform((value) => new Date(value)),
      to: dateString.transform((value) => new Date(value)),
      warehouseId: objectId.optional(),
    })
    .refine((value) => value.from <= value.to, {
      message: "from must be before to",
    }),
});

export const exportReportValidation = z.object({
  body: z.object({
    recipientEmail: z.string().email(),
    kind: z.enum([
      "stock-movement",
      "department-consumption",
      "stock-status",
    ]),
    format: z.enum(["xlsx", "pdf"]),
    filters: z
      .object({
        from: dateString.optional(),
        to: dateString.optional(),
        warehouseId: objectId.optional(),
      })
      .default({}),
  }),
});
