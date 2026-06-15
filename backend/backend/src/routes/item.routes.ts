import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { itemController } from "../controllers/item.controller";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  balanceListValidation,
  batchListValidation,
  createItemValidation,
  deadStockValidation,
  expiringStockValidation,
  idValidation,
  itemMovementValidation,
  itemListValidation,
  itemStockValidation,
  scanItemValidation,
  stockAdjustmentValidation,
  updateItemValidation,
} from "../validations/inventory.validation";

export const itemRouter = Router();

itemRouter.get(
  "/low-stock",
  checkPermission(Permission.INVENTORY_READ),
  validate(balanceListValidation),
  itemController.lowStock,
);
itemRouter.get(
  "/dead-stock",
  checkPermission(Permission.INVENTORY_READ),
  validate(deadStockValidation),
  itemController.deadStock,
);
itemRouter.get(
  "/expiring",
  checkPermission(Permission.INVENTORY_READ),
  validate(expiringStockValidation),
  itemController.expiring,
);
itemRouter.post(
  "/scan",
  checkPermission(Permission.INVENTORY_READ),
  validate(scanItemValidation),
  itemController.scan,
);
itemRouter.get(
  "/",
  checkPermission(Permission.INVENTORY_READ),
  validate(itemListValidation),
  itemController.list,
);
itemRouter.post(
  "/",
  checkPermission(Permission.INVENTORY_CREATE),
  checkPlanLimit(PlanFeature.ITEMS),
  validate(createItemValidation),
  itemController.create,
);
itemRouter.get(
  "/:id/stock",
  checkPermission(Permission.INVENTORY_READ),
  validate(itemStockValidation),
  itemController.stock,
);
itemRouter.get(
  "/:id/movements",
  checkPermission(Permission.INVENTORY_READ),
  validate(itemMovementValidation),
  itemController.movements,
);
itemRouter.get(
  "/:id/batches",
  checkPermission(Permission.INVENTORY_READ),
  validate(batchListValidation),
  itemController.batches,
);
itemRouter.post(
  "/:id/adjust-stock",
  checkPermission(Permission.STOCK_ADJUST),
  validate(stockAdjustmentValidation),
  itemController.adjustStock,
);
itemRouter.get(
  "/:id",
  checkPermission(Permission.INVENTORY_READ),
  validate(idValidation),
  itemController.get,
);
itemRouter.put(
  "/:id",
  checkPermission(Permission.INVENTORY_UPDATE),
  validate(updateItemValidation),
  itemController.update,
);
itemRouter.delete(
  "/:id",
  checkPermission(Permission.INVENTORY_DELETE),
  validate(idValidation),
  itemController.remove,
);
