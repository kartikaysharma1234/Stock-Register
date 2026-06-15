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

export const loginValidation = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
});

export const refreshValidation = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

export const forgotPasswordValidation = z.object({
  body: z.object({ email: z.string().email() }),
});

export const resetPasswordValidation = z.object({
  body: z.object({ token: z.string().min(32), password }),
});

export const verifyEmailValidation = z.object({
  body: z.object({ token: z.string().min(32) }),
});

export const inviteUserValidation = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().email(),
    role: z.nativeEnum(Role),
    organizationId: objectId.optional(),
    customRoleId: objectId.optional(),
    permissions: z.array(z.nativeEnum(Permission)).max(200).optional(),
    departmentId: objectId.optional(),
    warehouseId: objectId.optional(),
    departmentIds: z.array(objectId).max(100).default([]),
    warehouseIds: z.array(objectId).max(100).default([]),
  }),
});

export const acceptInviteValidation = resetPasswordValidation;
