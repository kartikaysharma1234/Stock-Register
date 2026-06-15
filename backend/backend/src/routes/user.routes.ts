import { Router } from "express";
import { Permission, PlanFeature } from "../constants";
import { userController } from "../controllers/user.controller";
import { checkOwnership } from "../middlewares/ownership.middleware";
import { checkPlanLimit } from "../middlewares/plan-limit.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  userCreateValidation,
  userIdValidation,
  userListValidation,
  userPermissionValidation,
  userUpdateValidation,
} from "../validations/user.validation";

export const userRouter = Router();

userRouter.get(
  "/",
  checkPermission(Permission.USER_READ),
  validate(userListValidation),
  checkOwnership,
  userController.list,
);
userRouter.post(
  "/",
  checkPermission(Permission.USER_CREATE),
  checkPlanLimit(PlanFeature.USERS),
  validate(userCreateValidation),
  checkOwnership,
  userController.create,
);
userRouter.get(
  "/:id",
  checkPermission(Permission.USER_READ),
  validate(userIdValidation),
  userController.get,
);
userRouter.put(
  "/:id",
  checkPermission(Permission.USER_UPDATE),
  validate(userUpdateValidation),
  checkOwnership,
  userController.update,
);
userRouter.patch(
  "/:id",
  checkPermission(Permission.USER_UPDATE),
  validate(userUpdateValidation),
  checkOwnership,
  userController.update,
);
userRouter.delete(
  "/:id",
  checkPermission(Permission.USER_DELETE),
  validate(userIdValidation),
  userController.remove,
);
userRouter.put(
  "/:id/permissions",
  checkPermission(Permission.USER_UPDATE),
  validate(userPermissionValidation),
  userController.setPermissions,
);
