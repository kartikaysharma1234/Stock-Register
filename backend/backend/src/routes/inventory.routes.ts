import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { inventoryController } from "../controllers/inventory.controller";
import { requirePermissions } from "../middlewares/rbac.middleware";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  balanceListValidation,
  createItemValidation,
  idValidation,
  itemListValidation,
  movementListValidation,
  stockChangeValidation,
  updateItemValidation,
} from "../validations/inventory.validation";

export const inventoryRouter = Router();

inventoryRouter
  .route("/items")
  .get(
    requirePermissions(Permission.INVENTORY_READ),
    validate(itemListValidation),
    inventoryController.listItems,
  )
  .post(
    requirePermissions(Permission.INVENTORY_MANAGE),
    checkPlanLimit(PlanFeature.ITEMS),
    validate(createItemValidation),
    inventoryController.createItem,
  );
inventoryRouter
  .route("/items/:id")
  .patch(
    requirePermissions(Permission.INVENTORY_MANAGE),
    validate(updateItemValidation),
    inventoryController.updateItem,
  )
  .delete(
    requirePermissions(Permission.INVENTORY_MANAGE),
    validate(idValidation),
    inventoryController.archiveItem,
  );
inventoryRouter.get(
  "/balances",
  requirePermissions(Permission.INVENTORY_READ),
  validate(balanceListValidation),
  inventoryController.balances,
);
inventoryRouter.get(
  "/low-stock",
  requirePermissions(Permission.INVENTORY_READ),
  validate(balanceListValidation),
  inventoryController.lowStock,
);
inventoryRouter.get(
  "/movements",
  requirePermissions(Permission.INVENTORY_READ),
  validate(movementListValidation),
  inventoryController.movements,
);
inventoryRouter.post(
  "/stock-in",
  requirePermissions(Permission.STOCK_MOVE),
  validate(stockChangeValidation),
  inventoryController.stockIn,
);
inventoryRouter.post(
  "/stock-out",
  requirePermissions(Permission.STOCK_MOVE),
  validate(stockChangeValidation),
  inventoryController.stockOut,
);
