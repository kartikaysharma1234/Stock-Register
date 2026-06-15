import { z } from "zod";
import { objectId } from "./common.validation";

const code = z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/);

export const organizationValidation = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    code,
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
  }),
});

export const organizationUpdateValidation = z.object({
  params: z.object({ id: objectId.optional() }),
  body: organizationValidation.shape.body.partial(),
});

export const masterDataValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(150),
    code,
    location: z.string().max(300).optional(),
    description: z.string().max(500).optional(),
    headUserId: objectId.optional(),
    managerUserIds: z.array(objectId).optional(),
  }),
});

export const masterDataUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  body: masterDataValidation.shape.body.partial(),
});
