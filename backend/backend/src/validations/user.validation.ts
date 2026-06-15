import { z } from "zod";
import { Permission, Role } from "../constants";
import { objectId } from "./common.validation";

const password = z
  .string()
  .min(10)
  .max(128)
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

const assignments = {
  customRoleId: objectId.optional(),
  departmentId: objectId.optional(),
  warehouseId: objectId.optional(),
  departmentIds: z.array(objectId).max(100).optional(),
  warehouseIds: z.array(objectId).max(100).optional(),
};

export const userListValidation = z.object({
  query: z.object({
    organizationId: objectId.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    departmentId: objectId.optional(),
    warehouseId: objectId.optional(),
  }),
});

export const userIdValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
});

export const userCreateValidation = z.object({
  body: z.object({
    organizationId: objectId.optional(),
    name: z.string().trim().min(2).max(120),
    email: z.string().email(),
    password,
    role: z.nativeEnum(Role),
    permissions: z.array(z.nativeEnum(Permission)).max(200).optional(),
    ...assignments,
    isActive: z.boolean().optional(),
  }),
});

export const userUpdateValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      role: z.nativeEnum(Role).optional(),
      customRoleId: objectId.nullable().optional(),
      departmentId: objectId.nullable().optional(),
      warehouseId: objectId.nullable().optional(),
      departmentIds: z.array(objectId).max(100).optional(),
      warehouseIds: z.array(objectId).max(100).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const userPermissionValidation = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ organizationId: objectId.optional() }),
  body: z.object({
    permissions: z.array(z.nativeEnum(Permission)).max(200),
  }),
});
