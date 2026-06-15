import { Router } from "express";
import { Permission } from "../constants";
import { stockController } from "../controllers/stock.controller";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  movementListValidation,
  stockReconciliationValidation,
  stockTransferValidation,
} from "../validations/inventory.validation";

export const stockRouter = Router();

stockRouter.post(
  "/transfer",
  checkPermission(Permission.STOCK_TRANSFER),
  validate(stockTransferValidation),
  stockController.transfer,
);
stockRouter.get(
  "/movements",
  checkPermission(Permission.INVENTORY_READ),
  validate(movementListValidation),
  stockController.movements,
);
stockRouter.post(
  "/reconcile",
  checkPermission(Permission.STOCK_RECONCILE),
  validate(stockReconciliationValidation),
  stockController.reconcile,
);
