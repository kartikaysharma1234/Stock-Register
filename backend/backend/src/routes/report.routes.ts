import { Router } from "express";
import { Permission } from "../constants/permissions";
import { reportController } from "../controllers/report.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  dateRangeValidation,
  exportReportValidation,
} from "../validations/report.validation";

export const reportRouter = Router();

reportRouter.get(
  "/stock-movements",
  requirePermissions(Permission.REPORT_READ),
  validate(dateRangeValidation),
  reportController.stockMovements,
);
reportRouter.get(
  "/department-consumption",
  requirePermissions(Permission.REPORT_READ),
  validate(dateRangeValidation),
  reportController.departmentConsumption,
);
reportRouter.get(
  "/stock-status",
  requirePermissions(Permission.REPORT_READ),
  reportController.stockStatus,
);
reportRouter.post(
  "/export",
  requirePermissions(Permission.REPORT_EXPORT),
  validate(exportReportValidation),
  reportController.export,
);
