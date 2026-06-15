import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { warehouseController } from "../controllers/warehouse.controller";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { checkPermission, requirePermissions } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  warehouseCreateValidation,
  warehouseIdValidation,
  warehouseListValidation,
  warehouseMovementValidation,
  warehouseStockValidation,
  warehouseUpdateValidation,
  warehouseZoneCreateValidation,
  warehouseZoneListValidation,
  warehouseZoneUpdateValidation,
} from "../validations/warehouse.validation";

export const warehouseRouter = Router();

warehouseRouter.get(
  "/",
  checkPermission(Permission.WAREHOUSE_READ),
  validate(warehouseListValidation),
  warehouseController.list,
);
warehouseRouter.post(
  "/",
  checkPermission(Permission.WAREHOUSE_CREATE),
  checkPlanLimit(PlanFeature.WAREHOUSES),
  validate(warehouseCreateValidation),
  warehouseController.create,
);
warehouseRouter.get(
  "/:id/zones",
  checkPermission(Permission.WAREHOUSE_READ),
  validate(warehouseZoneListValidation),
  warehouseController.listZones,
);
warehouseRouter.post(
  "/:id/zones",
  checkPermission(Permission.WAREHOUSE_UPDATE),
  validate(warehouseZoneCreateValidation),
  warehouseController.createZone,
);
warehouseRouter.put(
  "/:id/zones/:zoneId",
  checkPermission(Permission.WAREHOUSE_UPDATE),
  validate(warehouseZoneUpdateValidation),
  warehouseController.updateZone,
);
warehouseRouter.get(
  "/:id/stock",
  requirePermissions(
    Permission.WAREHOUSE_READ,
    Permission.INVENTORY_READ,
  ),
  validate(warehouseStockValidation),
  warehouseController.stock,
);
warehouseRouter.get(
  "/:id/movements",
  requirePermissions(
    Permission.WAREHOUSE_READ,
    Permission.INVENTORY_READ,
  ),
  validate(warehouseMovementValidation),
  warehouseController.movements,
);
warehouseRouter.get(
  "/:id",
  checkPermission(Permission.WAREHOUSE_READ),
  validate(warehouseIdValidation),
  warehouseController.get,
);
warehouseRouter.put(
  "/:id",
  checkPermission(Permission.WAREHOUSE_UPDATE),
  validate(warehouseUpdateValidation),
  warehouseController.update,
);
warehouseRouter.delete(
  "/:id",
  checkPermission(Permission.WAREHOUSE_DELETE),
  validate(warehouseIdValidation),
  warehouseController.remove,
);
