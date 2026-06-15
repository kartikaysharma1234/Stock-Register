import { Router } from "express";
import { Permission } from "../constants";
import { roleController } from "../controllers/role.controller";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  roleCreateValidation,
  roleDeleteValidation,
  roleListValidation,
  roleUpdateValidation,
} from "../validations/role.validation";

export const roleRouter = Router();

roleRouter.get(
  "/",
  checkPermission(Permission.ROLE_READ),
  validate(roleListValidation),
  roleController.list,
);
roleRouter.post(
  "/",
  checkPermission(Permission.ROLE_CREATE),
  validate(roleCreateValidation),
  roleController.create,
);
roleRouter.put(
  "/:id",
  checkPermission(Permission.ROLE_UPDATE),
  validate(roleUpdateValidation),
  roleController.update,
);
roleRouter.delete(
  "/:id",
  checkPermission(Permission.ROLE_DELETE),
  validate(roleDeleteValidation),
  roleController.remove,
);
