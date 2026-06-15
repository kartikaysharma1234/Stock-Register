import { Router } from "express";
import { z } from "zod";
import { Permission } from "../constants/permissions";
import { auditController } from "../controllers/audit.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { dateString, objectId } from "../validations/common.validation";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requirePermissions(Permission.AUDIT_READ),
  validate(
    z.object({
      query: z.object({
        actorId: objectId.optional(),
        action: z.string().max(100).optional(),
        entityType: z.string().max(100).optional(),
        from: dateString.transform((value) => new Date(value)).optional(),
        to: dateString.transform((value) => new Date(value)).optional(),
      }),
    }),
  ),
  auditController.list,
);
