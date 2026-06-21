import { Router } from "express";
import { Permission } from "../constants/permissions";
import { reportController } from "../controllers/report.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createSavedReportValidation,
  dateRangeValidation,
  exportReportValidation,
  savedReportIdValidation,
  savedReportListValidation,
  stockStatusReportValidation,
  updateSavedReportValidation,
} from "../validations/report.validation";

export const reportRouter = Router();

reportRouter.get(
  "/dashboard",
  requirePermissions(Permission.REPORT_READ),
  validate(dateRangeValidation),
  reportController.dashboard,
);

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
  validate(stockStatusReportValidation),
  reportController.stockStatus,
);

reportRouter.get(
  "/low-stock",
  requirePermissions(Permission.REPORT_READ),
  validate(stockStatusReportValidation),
  reportController.lowStock,
);

reportRouter.get(
  "/out-of-stock",
  requirePermissions(Permission.REPORT_READ),
  validate(stockStatusReportValidation),
  reportController.outOfStock,
);

reportRouter.get(
  "/inventory-valuation",
  requirePermissions(Permission.REPORT_READ),
  validate(stockStatusReportValidation),
  reportController.inventoryValuation,
);

reportRouter.get(
  "/top-consumption",
  requirePermissions(Permission.REPORT_READ),
  validate(dateRangeValidation),
  reportController.topConsumption,
);

reportRouter.post(
  "/export",
  requirePermissions(Permission.REPORT_EXPORT),
  validate(exportReportValidation),
  reportController.export,
);

reportRouter.get(
  "/saved",
  requirePermissions(Permission.REPORT_SAVE),
  validate(savedReportListValidation),
  reportController.listSaved,
);

reportRouter.post(
  "/saved",
  requirePermissions(Permission.REPORT_SAVE),
  validate(createSavedReportValidation),
  reportController.createSaved,
);

reportRouter.get(
  "/saved/:id",
  requirePermissions(Permission.REPORT_SAVE),
  validate(savedReportIdValidation),
  reportController.getSaved,
);

reportRouter.put(
  "/saved/:id",
  requirePermissions(Permission.REPORT_SAVE),
  validate(updateSavedReportValidation),
  reportController.updateSaved,
);

reportRouter.delete(
  "/saved/:id",
  requirePermissions(Permission.REPORT_SAVE),
  validate(savedReportIdValidation),
  reportController.removeSaved,
);

reportRouter.post(
  "/saved/:id/run",
  requirePermissions(Permission.REPORT_EXPORT),
  validate(savedReportIdValidation),
  reportController.runSaved,
);
