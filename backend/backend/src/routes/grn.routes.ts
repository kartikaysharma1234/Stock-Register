import { Router } from "express";
import { Permission } from "../constants";
import { procurementController } from "../controllers/procurement.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  grnIdValidation,
  grnListValidation,
} from "../validations/procurement.validation";

export const grnRouter = Router();

grnRouter.get(
  "/",
  requirePermissions(Permission.GRN_READ),
  validate(grnListValidation),
  procurementController.listGrns,
);

grnRouter.get(
  "/:id",
  requirePermissions(Permission.GRN_READ),
  validate(grnIdValidation),
  procurementController.getGrn,
);
