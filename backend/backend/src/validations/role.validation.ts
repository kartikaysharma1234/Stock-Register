import { z } from "zod";
import { Permission } from "../constants";
import { objectId } from "./common.validation";

export const roleListValidation = z.object({
  query: z.object({ organizationId: objectId.optional() }),
});

export const roleCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(80),
    permissions: z.array(z.nativeEnum(Permission)).max(200).default([]),
  }),
});

export const roleUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      permissions: z.array(z.nativeEnum(Permission)).max(200).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const roleDeleteValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
});
