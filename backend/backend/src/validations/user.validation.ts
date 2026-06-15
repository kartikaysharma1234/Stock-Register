import { z } from "zod";
import { Role } from "../constants/roles";
import { objectId } from "./common.validation";

export const userListValidation = z.object({
  query: z.object({ organizationId: objectId.optional() }),
});

export const userUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.nativeEnum(Role).optional(),
    departmentIds: z.array(objectId).optional(),
    warehouseIds: z.array(objectId).optional(),
    isActive: z.boolean().optional(),
  }),
});
