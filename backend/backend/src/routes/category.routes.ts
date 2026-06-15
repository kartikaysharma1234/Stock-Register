import { Router } from "express";
import { Permission } from "../constants";
import { categoryController } from "../controllers/category.controller";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  categoryCreateValidation,
  categoryListValidation,
  categoryUpdateValidation,
  idValidation,
} from "../validations/inventory.validation";

export const categoryRouter = Router();

categoryRouter.get(
  "/",
  checkPermission(Permission.CATEGORY_READ),
  validate(categoryListValidation),
  categoryController.list,
);
categoryRouter.post(
  "/",
  checkPermission(Permission.CATEGORY_CREATE),
  validate(categoryCreateValidation),
  categoryController.create,
);
categoryRouter.put(
  "/:id",
  checkPermission(Permission.CATEGORY_UPDATE),
  validate(categoryUpdateValidation),
  categoryController.update,
);
categoryRouter.delete(
  "/:id",
  checkPermission(Permission.CATEGORY_DELETE),
  validate(idValidation),
  categoryController.remove,
);
