import { Router } from "express";
import { Permission } from "../constants/permissions";
import { auditController } from "../controllers/audit.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  auditExportValidation,
  auditListValidation,
  auditResourceHistoryValidation,
} from "../validations/audit.validation";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requirePermissions(Permission.AUDIT_READ),
  validate(auditListValidation),
  auditController.list,
);

auditRouter.get(
  "/export",
  requirePermissions(Permission.AUDIT_EXPORT),
  validate(auditExportValidation),
  auditController.export,
);

auditRouter.get(
  "/:resourceId",
  requirePermissions(Permission.AUDIT_READ),
  validate(auditResourceHistoryValidation),
  auditController.resourceHistory,
);
